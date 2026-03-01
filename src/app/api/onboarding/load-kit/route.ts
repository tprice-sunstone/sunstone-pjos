// ============================================================================
// Load Kit API — POST /api/onboarding/load-kit
// ============================================================================
// Auto-populates inventory with Sunstone starter kit items.
// Prevents duplicates: if inventory already exists, returns existing count.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

type KitType = 'momentum' | 'dream' | 'legacy';

interface ChainDef {
  name: string;
  material: string;
}

interface KitDefinition {
  chains: ChainDef[];
  chainLength: number;
  jumpRings: { name: string; material: string; quantity: number }[];
  connectors: { name: string; material: string; quantity: number }[];
}

const KIT_DATA: Record<KitType, KitDefinition> = {
  momentum: {
    chains: [
      { name: 'Figaro', material: 'Sterling Silver' },
      { name: 'Cable', material: 'Sterling Silver' },
      { name: 'Paperclip', material: 'Sterling Silver' },
      { name: 'Rope', material: 'Sterling Silver' },
      { name: 'Figaro', material: '14K Gold-Filled' },
      { name: 'Cable', material: '14K Gold-Filled' },
      { name: 'Paperclip', material: '14K Gold-Filled' },
    ],
    chainLength: 36,
    jumpRings: [
      { name: 'Jump Rings - Sterling Silver', material: 'Sterling Silver', quantity: 25 },
      { name: 'Jump Rings - 14K Gold-Filled', material: '14K Gold-Filled', quantity: 25 },
    ],
    connectors: [],
  },
  dream: {
    chains: [
      { name: 'Figaro', material: 'Sterling Silver' },
      { name: 'Cable', material: 'Sterling Silver' },
      { name: 'Paperclip', material: 'Sterling Silver' },
      { name: 'Rope', material: 'Sterling Silver' },
      { name: 'Box', material: 'Sterling Silver' },
      { name: 'Figaro', material: '14K Gold-Filled' },
      { name: 'Cable', material: '14K Gold-Filled' },
      { name: 'Paperclip', material: '14K Gold-Filled' },
      { name: 'Rope', material: '14K Gold-Filled' },
    ],
    chainLength: 36,
    jumpRings: [
      { name: 'Jump Rings - Sterling Silver', material: 'Sterling Silver', quantity: 50 },
      { name: 'Jump Rings - 14K Gold-Filled', material: '14K Gold-Filled', quantity: 50 },
    ],
    connectors: [
      { name: 'Connectors - Sterling Silver', material: 'Sterling Silver', quantity: 25 },
      { name: 'Connectors - 14K Gold-Filled', material: '14K Gold-Filled', quantity: 25 },
    ],
  },
  legacy: {
    chains: [
      { name: 'Figaro', material: 'Sterling Silver' },
      { name: 'Cable', material: 'Sterling Silver' },
      { name: 'Paperclip', material: 'Sterling Silver' },
      { name: 'Rope', material: 'Sterling Silver' },
      { name: 'Box', material: 'Sterling Silver' },
      { name: 'Curb', material: 'Sterling Silver' },
      { name: 'Satellite', material: 'Sterling Silver' },
      { name: 'Figaro', material: '14K Gold-Filled' },
      { name: 'Cable', material: '14K Gold-Filled' },
      { name: 'Paperclip', material: '14K Gold-Filled' },
      { name: 'Rope', material: '14K Gold-Filled' },
      { name: 'Box', material: '14K Gold-Filled' },
      { name: 'Curb', material: '14K Gold-Filled' },
      { name: 'Satellite', material: '14K Gold-Filled' },
      { name: 'Herringbone', material: '14K Gold-Filled' },
    ],
    chainLength: 36,
    jumpRings: [
      { name: 'Jump Rings - Sterling Silver', material: 'Sterling Silver', quantity: 100 },
      { name: 'Jump Rings - 14K Gold-Filled', material: '14K Gold-Filled', quantity: 100 },
    ],
    connectors: [
      { name: 'Connectors - Sterling Silver', material: 'Sterling Silver', quantity: 50 },
      { name: 'Connectors - 14K Gold-Filled', material: '14K Gold-Filled', quantity: 50 },
    ],
  },
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get tenant
    const { data: member } = await supabase
      .from('tenant_members')
      .select('tenant_id')
      .eq('user_id', user.id)
      .not('accepted_at', 'is', null)
      .limit(1)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 });
    }

    const tenantId = member.tenant_id;

    // Prevent duplicates: check if inventory items already exist
    const { count: existingCount } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    if (existingCount && existingCount > 0) {
      return NextResponse.json({
        itemsCreated: 0,
        existing: existingCount,
        message: 'Inventory already populated',
      });
    }

    const { kit } = await request.json();
    if (!kit || !KIT_DATA[kit as KitType]) {
      return NextResponse.json({ error: 'Invalid kit type' }, { status: 400 });
    }

    const kitDef = KIT_DATA[kit as KitType];
    const items: any[] = [];

    // Insert chains
    for (const chain of kitDef.chains) {
      items.push({
        tenant_id: tenantId,
        name: `${chain.name} - ${chain.material}`,
        type: 'chain',
        material: chain.material,
        unit: 'in',
        quantity_on_hand: kitDef.chainLength,
        supplier: 'Sunstone',
        pricing_mode: 'per_product',
        cost_per_unit: 0,
        sell_price: 0,
        reorder_threshold: 12,
        is_active: true,
      });
    }

    // Insert jump rings
    for (const jr of kitDef.jumpRings) {
      items.push({
        tenant_id: tenantId,
        name: jr.name,
        type: 'jump_ring',
        material: jr.material,
        unit: 'each',
        quantity_on_hand: jr.quantity,
        supplier: 'Sunstone',
        pricing_mode: 'per_product',
        cost_per_unit: 0,
        sell_price: 0,
        reorder_threshold: 10,
        is_active: true,
      });
    }

    // Insert connectors (Dream/Legacy)
    for (const conn of kitDef.connectors) {
      items.push({
        tenant_id: tenantId,
        name: conn.name,
        type: 'connector',
        material: conn.material,
        unit: 'each',
        quantity_on_hand: conn.quantity,
        supplier: 'Sunstone',
        pricing_mode: 'per_product',
        cost_per_unit: 0,
        sell_price: 0,
        reorder_threshold: 10,
        is_active: true,
      });
    }

    const { error: insertError } = await supabase
      .from('inventory_items')
      .insert(items);

    if (insertError) {
      console.error('Kit load insert error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Update onboarding_data with kit info (read-modify-write)
    const { data: tenant } = await supabase
      .from('tenants')
      .select('onboarding_data')
      .eq('id', tenantId)
      .single();

    const currentData = (tenant?.onboarding_data as Record<string, any>) || {};
    await supabase
      .from('tenants')
      .update({
        onboarding_data: {
          ...currentData,
          kit,
          kit_loaded_at: new Date().toISOString(),
        },
      })
      .eq('id', tenantId);

    return NextResponse.json({
      itemsCreated: items.length,
      chains: kitDef.chains.length,
      jumpRings: kitDef.jumpRings.reduce((sum, jr) => sum + jr.quantity, 0),
    });
  } catch (error: any) {
    console.error('Load kit error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
