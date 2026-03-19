// ============================================================================
// SF Create Reorder — src/app/api/salesforce/create-reorder/route.ts
// ============================================================================
// POST: Creates SF Opportunity (Quote Sent stage) + Quote + QuoteLineItems,
// syncs the Quote. Called BEFORE payment — Opp is moved to Closed Won
// only after payment succeeds via the /finalize endpoint.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { sfQuery, sfCreate, sfUpdate, sfGet } from '@/lib/salesforce';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
    }

    const body = await request.json();
    const { reorderId, contactId } = body;

    if (!reorderId) {
      return NextResponse.json({ error: 'Missing reorderId' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    // Load reorder + tenant
    const { data: reorder } = await serviceClient
      .from('reorder_history')
      .select('*')
      .eq('id', reorderId)
      .eq('tenant_id', member.tenant_id)
      .single();

    if (!reorder) {
      return NextResponse.json({ error: 'Reorder not found' }, { status: 404 });
    }

    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('sf_account_id, name')
      .eq('id', member.tenant_id)
      .single();

    const sfAccountId = tenant?.sf_account_id;

    if (!sfAccountId) {
      return NextResponse.json({ error: 'No Salesforce account linked. Match your account first.' }, { status: 400 });
    }

    // Match SF Product2 records
    const items = reorder.items as any[];
    const skus = items.map((i: any) => i.variant_id).filter(Boolean);

    let sfProducts: any[] = [];
    if (skus.length > 0) {
      const skuList = skus.map((s: string) => `'${s.replace(/'/g, "\\'")}'`).join(',');
      sfProducts = await sfQuery<any>(
        `SELECT Id, Name, ProductCode FROM Product2 WHERE ProductCode IN (${skuList})`
      );
    }

    // Fall back to name match for unmatched items
    const matchedSkus = new Set(sfProducts.map((p: any) => p.ProductCode));
    const unmatchedItems = items.filter((i: any) => !matchedSkus.has(i.variant_id));

    if (unmatchedItems.length > 0) {
      for (const item of unmatchedItems) {
        const nameClean = item.name.replace(/'/g, "\\'").split(' — ')[0];
        const nameMatches = await sfQuery<any>(
          `SELECT Id, Name, ProductCode FROM Product2 WHERE Name LIKE '%${nameClean}%' LIMIT 1`
        );
        if (nameMatches.length > 0) {
          sfProducts.push(nameMatches[0]);
        }
      }
    }

    // Get PricebookEntry IDs
    const sfProductIds = sfProducts.map((p: any) => `'${p.Id}'`).join(',');
    let pricebookEntries: any[] = [];
    if (sfProductIds) {
      pricebookEntries = await sfQuery<any>(
        `SELECT Id, Product2Id, UnitPrice FROM PricebookEntry WHERE Product2Id IN (${sfProductIds}) AND Pricebook2.IsStandard = true`
      );
    }

    const pbeByProductId = new Map(pricebookEntries.map((e: any) => [e.Product2Id, e]));

    // Create Opportunity (Quote Sent — NOT Closed Won until payment succeeds)
    const today = new Date().toISOString().split('T')[0];
    const oppName = `Studio Reorder — ${tenant?.name || 'Artist'} — ${today}`;

    const oppId = await sfCreate('Opportunity', {
      Name: oppName,
      AccountId: sfAccountId,
      StageName: 'Quote Sent',
      CloseDate: today,
      Amount: reorder.total_amount,
      Direct_Order__c: true,
      LeadSource: 'Sunstone Studio',
      Industry__c: 'Permanent Jewelry',
      Description: `Sunstone Studio App Order — placed by ${tenant?.name || 'Artist'}`,
    });

    // Parse shipping from notes
    const noteParts = (reorder.notes || '').replace('Shipping to: ', '').split(', ');
    const shippingStreet = noteParts[0] || '';
    const shippingCity = noteParts[1] || '';
    const stateZip = (noteParts[2] || '').split(' ');
    const shippingState = stateZip[0] || '';
    const shippingPostalCode = stateZip[1] || '';

    // Create Quote (Accepted) — include ContactId for validation rules
    const quoteFields: Record<string, any> = {
      Name: `Q-${oppName}`,
      OpportunityId: oppId,
      Status: 'Accepted',
      Direct_Order__c: true,
      ShippingStreet: shippingStreet,
      ShippingCity: shippingCity,
      ShippingState: shippingState,
      ShippingPostalCode: shippingPostalCode,
      ShippingCountry: 'US',
      Description: 'Auto-created from Sunstone Studio reorder',
    };

    // Add ContactId if provided (required for Closed Won validation)
    if (contactId) {
      quoteFields.ContactId = contactId;
    }

    const quoteId = await sfCreate('Quote', quoteFields);

    // Create QuoteLineItems
    for (const item of items) {
      const sfProd = sfProducts.find(
        (p: any) => p.ProductCode === item.variant_id || p.Name.includes(item.name.split(' — ')[0])
      );

      if (sfProd && pbeByProductId.has(sfProd.Id)) {
        const pbe = pbeByProductId.get(sfProd.Id);
        await sfCreate('QuoteLineItem', {
          QuoteId: quoteId,
          PricebookEntryId: pbe.Id,
          Quantity: item.quantity,
          UnitPrice: item.unit_price,
        });
      } else {
        console.warn(`[SF Reorder] No SF product match for item: ${item.name}`);
      }
    }

    // Sync Quote
    await sfUpdate('Quote', quoteId, { IsSyncing: true });

    // Wait for sync, then read back tax/shipping
    await sleep(3000);

    let sfTax = reorder.tax_amount;
    let sfShipping = reorder.shipping_amount;
    let sfGrandTotal = reorder.total_amount;

    try {
      const quote = await sfGet<any>('Quote', quoteId, [
        'Tax', 'ShippingHandling', 'New_Grand_Total__c',
      ]);
      if (quote.Tax != null) sfTax = Number(quote.Tax);
      if (quote.ShippingHandling != null) sfShipping = Number(quote.ShippingHandling);
      if (quote.New_Grand_Total__c != null) sfGrandTotal = Number(quote.New_Grand_Total__c);
    } catch (err) {
      console.warn('[SF Reorder] Could not re-read quote after sync:', err);
    }

    // Update reorder_history with SF IDs (status stays pending_payment until charged)
    await serviceClient
      .from('reorder_history')
      .update({
        sf_opportunity_id: oppId,
        sf_quote_id: quoteId,
        tax_amount: sfTax,
        shipping_amount: sfShipping,
        total_amount: sfGrandTotal,
      })
      .eq('id', reorderId);

    return NextResponse.json({
      success: true,
      opportunityId: oppId,
      quoteId,
      opportunityName: oppName,
      tax: sfTax,
      shipping: sfShipping,
      grandTotal: sfGrandTotal,
    });
  } catch (err: any) {
    console.error('[SF Create Reorder] Error:', err);
    return NextResponse.json({
      error: 'Salesforce order creation failed.',
      sfError: err.message,
    }, { status: 500 });
  }
}

// ── PATCH: Finalize — move Opportunity to Closed Won after payment ──────

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
    }

    const body = await request.json();
    const { reorderId } = body;

    if (!reorderId) {
      return NextResponse.json({ error: 'Missing reorderId' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    const { data: reorder } = await serviceClient
      .from('reorder_history')
      .select('sf_opportunity_id')
      .eq('id', reorderId)
      .eq('tenant_id', member.tenant_id)
      .single();

    if (!reorder?.sf_opportunity_id) {
      return NextResponse.json({ error: 'No SF Opportunity to finalize' }, { status: 400 });
    }

    // Move Opportunity to Closed Won
    await sfUpdate('Opportunity', reorder.sf_opportunity_id, {
      StageName: 'Closed Won',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[SF Finalize] Error:', err);
    // Non-critical — Opp can be finalized manually
    return NextResponse.json({ success: true, warning: 'Could not move Opportunity to Closed Won' });
  }
}
