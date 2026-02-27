import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { resolveAudience } from '@/lib/broadcasts';
import { renderTemplate } from '@/lib/templates';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Load broadcast
  const { data: broadcast } = await supabase
    .from('broadcasts')
    .select('*')
    .eq('id', id)
    .single();

  if (!broadcast) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Resolve message body/subject
  let messageBody = broadcast.custom_body || '';
  let messageSubject = broadcast.custom_subject || '';

  if (broadcast.template_id) {
    const { data: template } = await supabase
      .from('message_templates')
      .select('body, subject')
      .eq('id', broadcast.template_id)
      .single();
    if (template) {
      messageBody = template.body;
      messageSubject = template.subject || '';
    }
  }

  // Load tenant
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, phone')
    .eq('id', broadcast.tenant_id)
    .single();

  // Resolve audience
  const audience = await resolveAudience(supabase, broadcast.tenant_id, broadcast.target_type, broadcast.target_id);

  // Check contact info and consent
  let sendable = 0;
  let missingContact = 0;
  let noConsent = 0;

  // For SMS, check consent from most recent waiver
  const smsConsentMap: Record<string, boolean> = {};
  if (broadcast.channel === 'sms') {
    const clientIds = audience.map((c) => c.id);
    if (clientIds.length > 0) {
      const { data: waivers } = await supabase
        .from('waivers')
        .select('client_id, sms_consent')
        .in('client_id', clientIds)
        .order('created_at', { ascending: false });

      for (const w of waivers || []) {
        if (smsConsentMap[w.client_id] === undefined) {
          smsConsentMap[w.client_id] = w.sms_consent === true;
        }
      }
    }
  }

  const recipients = audience.map((client) => {
    const name = [client.first_name, client.last_name].filter(Boolean).join(' ') || 'Client';
    const contactField = broadcast.channel === 'sms' ? client.phone : client.email;
    const hasContact = !!contactField;
    const hasConsent = broadcast.channel === 'sms' ? (smsConsentMap[client.id] ?? false) : true;
    const willSend = hasContact && hasConsent;

    if (!hasContact) missingContact++;
    else if (!hasConsent) noConsent++;
    else sendable++;

    return { id: client.id, name, contact: contactField || null, willSend, hasConsent };
  });

  // Sample render with first sendable recipient
  const firstSendable = recipients.find((r) => r.willSend);
  const sampleVars: Record<string, string> = {
    client_name: firstSendable?.name || 'Client',
    client_first_name: (firstSendable?.name || 'Client').split(' ')[0],
    business_name: tenant?.name || 'Business',
    business_phone: tenant?.phone || '',
  };

  return NextResponse.json({
    total: audience.length,
    sendable,
    missingContact,
    noConsent,
    recipients: recipients.slice(0, 50), // cap preview list
    sampleBody: renderTemplate(messageBody, sampleVars),
    sampleSubject: messageSubject ? renderTemplate(messageSubject, sampleVars) : null,
  });
}
