// ============================================================================
// Reorder Receipt Email — src/app/api/reorders/send-receipt/route.ts
// ============================================================================
// POST: Sends a branded order confirmation receipt to the artist via Resend.
// Fire-and-forget from the frontend — doesn't block the confirmation screen.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { logEmailCost } from '@/lib/cost-tracker';

export async function POST(request: NextRequest) {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json({ sent: false, error: 'Email service not configured' }, { status: 503 });
    }

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
    const { reorderHistoryId, email, cardLabel } = body;

    if (!reorderHistoryId) {
      return NextResponse.json({ error: 'Missing reorderHistoryId' }, { status: 400 });
    }

    const recipientEmail = email || user.email;
    if (!recipientEmail) {
      return NextResponse.json({ sent: false, reason: 'no_email' });
    }

    const serviceClient = await createServiceRoleClient();

    // Load the reorder record
    const { data: reorder } = await serviceClient
      .from('reorder_history')
      .select('*')
      .eq('id', reorderHistoryId)
      .eq('tenant_id', member.tenant_id)
      .single();

    if (!reorder) {
      return NextResponse.json({ error: 'Reorder not found' }, { status: 404 });
    }

    // Load tenant name
    const { data: tenant } = await serviceClient
      .from('tenants')
      .select('name')
      .eq('id', member.tenant_id)
      .single();

    // Build email data
    const items = (reorder.items || []) as any[];
    const subtotal = items.reduce((sum: number, i: any) => sum + (i.unit_price || 0) * (i.quantity || 0), 0);
    const tax = reorder.tax_amount || 0;
    const shipping = reorder.shipping_amount || 0;
    const total = reorder.total_amount || subtotal + tax + shipping;

    // Parse shipping address from notes
    const noteParts = (reorder.notes || '').replace('Shipping to: ', '').split(', ');
    const shippingStreet = noteParts[0] || '';
    const shippingCityState = noteParts.slice(1).join(', ') || '';

    const orderDate = new Date(reorder.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });

    const subject = 'Order Confirmed — Sunstone Supply Order';

    const html = buildReceiptHTML({
      items,
      subtotal,
      tax,
      shipping,
      total,
      cardLabel: cardLabel || '',
      shippingStreet,
      shippingCityState,
      orderDate,
      businessName: tenant?.name || '',
    });

    // Send via Resend
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: recipientEmail,
      subject,
      html,
    });

    if (emailError) {
      console.error('[Reorder Receipt] Resend error:', emailError);
      return NextResponse.json({ sent: false, error: 'Failed to send receipt' }, { status: 500 });
    }

    // Log to message_log (fire-and-forget)
    serviceClient.from('message_log').insert({
      tenant_id: member.tenant_id,
      direction: 'outbound',
      channel: 'email',
      recipient_email: recipientEmail,
      subject,
      body: `Order confirmation receipt sent for reorder ${reorderHistoryId}`,
      source: 'reorder_receipt',
      status: 'sent',
    }).then(null, () => {});

    // Log to platform_costs (fire-and-forget)
    logEmailCost({ tenantId: member.tenant_id, operation: 'email_reorder_receipt' });

    return NextResponse.json({ sent: true, id: emailResult?.id });
  } catch (err: any) {
    console.error('[Reorder Receipt] Error:', err);
    return NextResponse.json({ sent: false, error: err.message }, { status: 500 });
  }
}

// ── Branded HTML builder ─────────────────────────────────────────────────

function buildReceiptHTML(data: {
  items: any[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  cardLabel: string;
  shippingStreet: string;
  shippingCityState: string;
  orderDate: string;
  businessName: string;
}) {
  const { items, subtotal, tax, shipping, total, cardLabel, shippingStreet, shippingCityState, orderDate, businessName } = data;

  const itemRows = items.map((item: any) => {
    const lineTotal = (item.unit_price || 0) * (item.quantity || 0);
    return `
      <tr>
        <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
          ${escapeHtml(item.name)} &times; ${item.quantity}
        </td>
        <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; text-align: right; white-space: nowrap;">
          $${lineTotal.toFixed(2)}
        </td>
      </tr>`;
  }).join('');

  const taxRow = tax > 0 ? `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Tax</td>
      <td style="padding: 6px 0; font-size: 14px; color: #374151; text-align: right;">$${tax.toFixed(2)}</td>
    </tr>` : '';

  const shippingRow = shipping > 0 ? `
    <tr>
      <td style="padding: 6px 0; font-size: 14px; color: #6b7280;">Shipping</td>
      <td style="padding: 6px 0; font-size: 14px; color: #374151; text-align: right;">$${shipping.toFixed(2)}</td>
    </tr>` : '';

  const paymentRow = cardLabel ? `
    <tr>
      <td colspan="2" style="padding: 10px 0 0 0; font-size: 13px; color: #9ca3af;">
        Payment: ${escapeHtml(cardLabel)}
      </td>
    </tr>` : '';

  const shippingSection = shippingStreet ? `
    <table role="presentation" width="100%" style="margin-top: 24px;">
      <tr>
        <td style="padding: 16px; background-color: #f9fafb; border-radius: 8px;">
          <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">Shipping To</p>
          <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.5;">
            ${escapeHtml(shippingStreet)}${shippingCityState ? `<br>${escapeHtml(shippingCityState)}` : ''}
          </p>
        </td>
      </tr>
    </table>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); overflow: hidden;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid #f3f4f6;">
              <p style="margin: 0 0 4px 0; font-size: 20px; font-weight: 700; color: #7A234A;">Sunstone</p>
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">Supply Order Confirmation</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 28px 32px;">
              <p style="margin: 0 0 4px 0; font-size: 18px; font-weight: 600; color: #111827;">Your order has been placed!</p>
              ${businessName ? `<p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">${escapeHtml(businessName)} &mdash; ${orderDate}</p>` : `<p style="margin: 0 0 16px 0; font-size: 14px; color: #6b7280;">${orderDate}</p>`}

              <p style="margin: 0 0 6px 0; font-size: 14px; color: #374151;">
                <span style="display: inline-block; padding: 2px 10px; background-color: #ecfdf5; color: #065f46; border-radius: 9999px; font-size: 12px; font-weight: 600;">Confirmed &mdash; Preparing to Ship</span>
              </p>

              <!-- Items table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                ${itemRows}
                <!-- Subtotal -->
                <tr>
                  <td style="padding: 12px 0 6px 0; font-size: 14px; color: #6b7280;">Subtotal</td>
                  <td style="padding: 12px 0 6px 0; font-size: 14px; color: #374151; text-align: right;">$${subtotal.toFixed(2)}</td>
                </tr>
                ${taxRow}
                ${shippingRow}
                <!-- Total -->
                <tr>
                  <td style="padding: 12px 0 6px 0; border-top: 2px solid #111827; font-size: 16px; font-weight: 700; color: #111827;">Total Charged</td>
                  <td style="padding: 12px 0 6px 0; border-top: 2px solid #111827; font-size: 16px; font-weight: 700; color: #7A234A; text-align: right;">$${total.toFixed(2)}</td>
                </tr>
                ${paymentRow}
              </table>

              ${shippingSection}

              <!-- Shipping note -->
              <table role="presentation" width="100%" style="margin-top: 24px;">
                <tr>
                  <td style="padding: 16px; background-color: #fefce8; border-radius: 8px; border: 1px solid #fef08a;">
                    <p style="margin: 0; font-size: 13px; color: #854d0e; line-height: 1.5;">
                      Orders typically ship within 1&ndash;2 business days. You&rsquo;ll receive tracking information once your order ships.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px 28px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0 0 4px 0; font-size: 13px; color: #9ca3af;">
                Questions? Contact us at 385-999-5240 or support@sunstonewelders.com
              </p>
              <p style="margin: 0; font-size: 12px; color: #d1d5db;">
                Powered by Sunstone Studio
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
