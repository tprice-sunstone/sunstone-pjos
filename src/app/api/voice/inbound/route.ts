// ============================================================================
// Inbound Voice Webhook — POST /api/voice/inbound
// ============================================================================
// Called by Twilio when someone CALLS a dedicated phone number.
// Looks up tenant, checks call handling preference, returns TwiML.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { validateTwilioWebhook } from '@/lib/twilio';
import { logVoiceCost } from '@/lib/cost-tracker';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function twimlResponse(twiml: string, status = 200) {
  return new NextResponse(twiml, {
    status,
    headers: { 'Content-Type': 'text/xml' },
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const from = formData.get('From') as string;
    const to = formData.get('To') as string;
    const callSid = formData.get('CallSid') as string;

    if (!from || !to) {
      return twimlResponse('<Response><Hangup/></Response>');
    }

    // Validate Twilio signature
    const signature = request.headers.get('x-twilio-signature') || '';
    const url = `${process.env.NEXT_PUBLIC_APP_URL || 'https://sunstonepj.app'}/api/voice/inbound`;
    const params: Record<string, string> = {};
    formData.forEach((value, key) => { params[key] = value as string; });

    if (!validateTwilioWebhook(url, params, signature)) {
      console.warn('[Voice Inbound] Invalid Twilio signature');
      return twimlResponse('<Response><Hangup/></Response>', 403);
    }

    const supabase = await createServiceRoleClient();

    // Look up tenant by dedicated phone number
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, name, call_handling, call_forward_number, call_greeting, call_mute_during_events, dedicated_phone_number')
      .eq('dedicated_phone_number', to)
      .single();

    if (!tenant) {
      console.warn('[Voice Inbound] No tenant found for number:', to);
      return twimlResponse(
        '<Response><Say>This number is not currently in service.</Say></Response>'
      );
    }

    // Check if artist is in Event Mode (if mute during events is enabled)
    let inEventMode = false;
    if (tenant.call_mute_during_events) {
      const now = new Date().toISOString();
      const { data: activeEvents } = await supabase
        .from('events')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('is_active', true)
        .lte('start_time', now)
        .gte('end_time', now)
        .limit(1);

      inEventMode = (activeEvents?.length || 0) > 0;
    }

    // Build greeting
    const greeting = escapeXml(
      tenant.call_greeting || `Hi, you've reached ${tenant.name || 'us'}.`
    );

    // Determine call handling mode
    let callMode = tenant.call_handling || 'text_only';

    // Override to text_only during active events
    if (inEventMode && tenant.call_mute_during_events) {
      callMode = 'text_only';
    }

    let twiml = '';

    switch (callMode) {
      case 'forward':
        if (tenant.call_forward_number) {
          twiml = `<Response>
  <Say voice="alice">${greeting} Please hold while we connect you.</Say>
  <Dial callerId="${escapeXml(tenant.dedicated_phone_number || '')}" timeout="30">
    <Number>${escapeXml(tenant.call_forward_number)}</Number>
  </Dial>
  <Say voice="alice">Sorry, we couldn&apos;t connect your call. Please send us a text at this number and we&apos;ll get right back to you. Goodbye.</Say>
</Response>`;
        } else {
          // No forward number configured — fall back to text only
          twiml = `<Response>
  <Say voice="alice">${greeting} This number is best reached by text message. Please hang up and send us a text and we&apos;ll get right back to you. Thank you!</Say>
</Response>`;
        }
        break;

      case 'text_only':
      default:
        twiml = `<Response>
  <Say voice="alice">${greeting} This number is best reached by text message. Please hang up and send us a text and we&apos;ll get right back to you. Thank you!</Say>
</Response>`;
        break;
    }

    // Log cost (fire-and-forget)
    logVoiceCost({ tenantId: tenant.id, operation: 'voice_inbound', metadata: { from, callSid } });

    return twimlResponse(twiml);
  } catch (error: any) {
    console.error('[Voice Inbound] Error:', error.message);
    return twimlResponse(
      '<Response><Say>We&apos;re sorry, something went wrong. Please try again later.</Say></Response>'
    );
  }
}
