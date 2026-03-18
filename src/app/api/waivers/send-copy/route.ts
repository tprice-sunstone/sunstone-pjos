// ============================================================================
// Send Waiver Copy — src/app/api/waivers/send-copy/route.ts
// ============================================================================
// POST: Email a signed waiver PDF copy to the customer.
// Public endpoint (called from /waiver page) — rate-limited by IP.
// Derives tenant + email from waiver record, never trusts client input.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import { logEmailCost } from '@/lib/cost-tracker';

const RATE_LIMIT = { prefix: 'waiver-copy', limit: 10, windowSeconds: 60 };
const MAX_PDF_BASE64_SIZE = 3 * 1024 * 1024; // 3MB

function buildWaiverEmailHTML(params: {
  tenantName: string;
  signerName: string;
  signedDate: string;
  accentColor: string;
}): string {
  const { tenantName, signerName, signedDate, accentColor } = params;
  const accent = accentColor || '#111827';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Signed Waiver</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 32px 16px;">
        <table role="presentation" style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #f3f4f6;">
              <h1 style="margin: 0 0 4px; font-size: 22px; font-weight: 700; color: ${accent};">
                ${tenantName}
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">Your Signed Waiver</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px; font-size: 15px; color: #374151; line-height: 1.6;">
                Hi ${signerName.split(' ')[0]},
              </p>
              <p style="margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.6;">
                Thank you for signing the service waiver with <strong>${tenantName}</strong> on ${signedDate}. A PDF copy of your signed waiver is attached for your records.
              </p>
              <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6;">
                If you have any questions, please contact the business directly.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; text-align: center; background-color: #f9fafb; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #6b7280;">
                This is an automated message. Please do not reply to this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #d1d5db;">Powered by Sunstone</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  try {
    // ── Check Resend is configured ──────────────────────────────────────
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json(
        { sent: false, error: 'Email service not configured' },
        { status: 503 }
      );
    }

    // ── Rate limit by IP (public endpoint) ──────────────────────────────
    const ip = getClientIP(request);
    const rl = checkRateLimit(ip, RATE_LIMIT);
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { waiverId, pdfBase64 } = await request.json();

    if (!waiverId || !pdfBase64) {
      return NextResponse.json(
        { sent: false, error: 'waiverId and pdfBase64 are required' },
        { status: 400 }
      );
    }

    // ── Validate PDF size ───────────────────────────────────────────────
    if (pdfBase64.length > MAX_PDF_BASE64_SIZE) {
      return NextResponse.json(
        { sent: false, error: 'PDF too large' },
        { status: 413 }
      );
    }

    // ── Look up waiver from DB — derive tenant + email server-side ─────
    const svc = await createServiceRoleClient();

    const { data: waiver, error: waiverErr } = await svc
      .from('waivers')
      .select('id, tenant_id, signer_name, signer_email, signed_at')
      .eq('id', waiverId)
      .single();

    if (waiverErr || !waiver) {
      return NextResponse.json(
        { sent: false, error: 'Waiver not found' },
        { status: 404 }
      );
    }

    // ── No email on file → skip silently ────────────────────────────────
    if (!waiver.signer_email) {
      return NextResponse.json({ sent: false, reason: 'no_email' });
    }

    // ── Get tenant for branding ─────────────────────────────────────────
    const { data: tenant } = await svc
      .from('tenants')
      .select('name, brand_color, theme_id')
      .eq('id', waiver.tenant_id)
      .single();

    const tenantName = tenant?.name || 'Sunstone Studio';
    const accentColor = tenant?.brand_color || '#111827';

    const signedDate = new Date(waiver.signed_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // ── Strip data URI prefix from base64 if present ────────────────────
    const rawBase64 = pdfBase64.includes(',')
      ? pdfBase64.split(',')[1]
      : pdfBase64;

    // ── Send email via Resend with PDF attachment ───────────────────────
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);

    const safeName = waiver.signer_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const dateStr = new Date(waiver.signed_at).toISOString().split('T')[0];

    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to: waiver.signer_email,
      subject: `Your signed waiver from ${tenantName}`,
      html: buildWaiverEmailHTML({
        tenantName,
        signerName: waiver.signer_name,
        signedDate,
        accentColor,
      }),
      attachments: [
        {
          filename: `waiver-${safeName}-${dateStr}.pdf`,
          content: rawBase64,
        },
      ],
    });

    if (error) {
      console.error('[Waiver Email Error]', error);
      return NextResponse.json(
        { sent: false, error: 'Failed to send email' },
        { status: 500 }
      );
    }

    // ── Log email cost (fire-and-forget) ────────────────────────────────
    logEmailCost({ tenantId: waiver.tenant_id, operation: 'email_waiver_copy' });

    // ── Log to message_log (fire-and-forget) ────────────────────────────
    svc.from('message_log').insert({
      tenant_id: waiver.tenant_id,
      direction: 'outbound',
      channel: 'email',
      recipient_email: waiver.signer_email,
      subject: `Your signed waiver from ${tenantName}`,
      body: `Signed waiver PDF copy sent to ${waiver.signer_name}`,
      source: 'waiver_copy',
      status: 'sent',
    }).then(null, () => {});

    return NextResponse.json({ sent: true, id: data?.id });
  } catch (err: any) {
    console.error('[Waiver Email Error]', err);
    return NextResponse.json(
      { sent: false, error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
