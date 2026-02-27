import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

const DEFAULT_TEMPLATES = [
  // SMS
  {
    name: 'Aftercare Reminder',
    channel: 'sms',
    category: 'aftercare',
    is_default: true,
    body: 'Hi {{client_name}}! 💍 Thanks for your new permanent jewelry from {{business_name}}! Remember: avoid pulling or tugging for the first 24 hours, and it\'s fine to shower and swim. Questions? Text us at {{business_phone}}!',
  },
  {
    name: 'Thank You',
    channel: 'sms',
    category: 'thank_you',
    is_default: true,
    body: 'Hi {{client_name}}! Thank you so much for visiting {{business_name}} today! We loved creating your piece. 💍✨',
  },
  {
    name: 'Booking Reminder',
    channel: 'sms',
    category: 'booking',
    is_default: true,
    body: 'Hi {{client_name}}! Just a reminder about your appointment with {{business_name}} tomorrow. We can\'t wait to see you! 💍',
  },
  // Email
  {
    name: 'Aftercare Instructions',
    channel: 'email',
    category: 'aftercare',
    is_default: true,
    subject: 'Your Permanent Jewelry Care Guide 💍',
    body: 'Hi {{client_name}},\n\nThank you for choosing {{business_name}} for your permanent jewelry! Here\'s everything you need to know about caring for your new piece:\n\n✨ First 24 Hours\n• Avoid pulling or tugging on your jewelry\n• Be gentle when getting dressed\n\n🚿 Daily Wear\n• Showering is perfectly fine!\n• Swimming in pools and the ocean is safe\n• Apply lotions and perfumes before putting on other jewelry\n\n💎 Long-Term Care\n• Your permanent jewelry is designed to last — no special cleaning needed\n• If it ever feels loose or needs attention, just reach out to us\n\nWe loved creating your piece and hope you enjoy it every day!\n\nWith love,\n{{business_name}}',
  },
  {
    name: 'Thank You',
    channel: 'email',
    category: 'thank_you',
    is_default: true,
    subject: 'Thank you for choosing {{business_name}}!',
    body: 'Hi {{client_name}},\n\nThank you so much for visiting us today! We absolutely loved creating your permanent jewelry piece.\n\nIf you have any questions about your jewelry or want to book another appointment, don\'t hesitate to reach out.\n\nWe hope to see you again soon! 💍✨\n\nWarmly,\n{{business_name}}',
  },
  {
    name: 'Special Promotion',
    channel: 'email',
    category: 'promotion',
    is_default: true,
    subject: 'Something special from {{business_name}} ✨',
    body: 'Hi {{client_name}},\n\nWe have something exciting to share with you!\n\n[Add your promotion details here]\n\nWe\'d love to see you again — book your next appointment today!\n\nXO,\n{{business_name}}',
  },
];

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  const channel = request.nextUrl.searchParams.get('channel');
  const category = request.nextUrl.searchParams.get('category');

  // Seed defaults if none exist
  const { data: existing } = await supabase
    .from('message_templates')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (!existing || existing.length === 0) {
    await supabase.from('message_templates').insert(
      DEFAULT_TEMPLATES.map((t) => ({ ...t, tenant_id: tenantId }))
    );
  }

  let query = supabase
    .from('message_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('channel')
    .order('name');

  if (channel) query = query.eq('channel', channel);
  if (category) query = query.eq('category', category);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { tenant_id, name, channel, subject, body: templateBody, category } = body;

  if (!tenant_id || !name || !channel || !templateBody) {
    return NextResponse.json({ error: 'tenant_id, name, channel, and body are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('message_templates')
    .insert({
      tenant_id,
      name: name.trim(),
      channel,
      subject: subject || null,
      body: templateBody,
      category: category || 'general',
      is_default: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
