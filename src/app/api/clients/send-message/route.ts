import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { renderTemplate } from '@/lib/templates';

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { tenantId, clientId, channel, subject, message } = body;

  if (!tenantId || !clientId || !channel || !message) {
    return NextResponse.json({ error: 'tenantId, clientId, channel, and message are required' }, { status: 400 });
  }

  // Fetch client and tenant for variable resolution
  const [clientRes, tenantRes] = await Promise.all([
    supabase.from('clients').select('first_name, last_name, email, phone').eq('id', clientId).single(),
    supabase.from('tenants').select('name, phone').eq('id', tenantId).single(),
  ]);

  if (!clientRes.data) return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  if (!tenantRes.data) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });

  const client = clientRes.data;
  const tenant = tenantRes.data;

  // Resolve template variables
  const variables: Record<string, string> = {
    client_name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
    client_first_name: client.first_name || '',
    business_name: tenant.name || '',
    business_phone: tenant.phone || '',
  };

  const resolvedMessage = renderTemplate(message, variables);
  const resolvedSubject = subject ? renderTemplate(subject, variables) : '';

  try {
    if (channel === 'sms') {
      if (!client.phone) return NextResponse.json({ error: 'Client has no phone number' }, { status: 400 });
      await sendSMS(client.phone, resolvedMessage);
    } else if (channel === 'email') {
      if (!client.email) return NextResponse.json({ error: 'Client has no email address' }, { status: 400 });
      await sendEmail(client.email, resolvedSubject || 'Message from ' + tenant.name, resolvedMessage);
    } else {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 });
    }

    // Log to message_log (fire-and-forget)
    supabase.from('message_log').insert({
      tenant_id: tenantId,
      client_id: clientId,
      direction: 'outbound',
      channel,
      recipient_email: channel === 'email' ? client.email : null,
      recipient_phone: channel === 'sms' ? client.phone : null,
      subject: channel === 'email' ? (resolvedSubject || 'Message from ' + tenant.name) : null,
      body: resolvedMessage,
      source: 'manual',
      status: 'sent',
    }).then(null, () => {});

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to send message' }, { status: 500 });
  }
}

// ── SMS via Twilio ──────────────────────────────────────────────────────────

async function sendSMS(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[Direct SMS Skipped] Would send to ${to}: ${body.slice(0, 50)}`);
    return;
  }

  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await client.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
}

// ── Email via Resend ────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, body: string) {
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    console.log(`[Direct Email Skipped] Would send to ${to}: ${subject}`);
    return;
  }

  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #374151;">
  ${body.split('\n').map((line) => `<p style="margin: 0 0 12px;">${line}</p>`).join('')}
</body></html>`;

  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to,
    subject,
    html,
  });

  if (error) throw new Error(error.message || 'Resend error');
}
