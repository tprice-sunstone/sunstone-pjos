import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

const DEFAULT_TAGS = [
  { name: 'VIP', color: '#D97706' },
  { name: 'Repeat Customer', color: '#059669' },
  { name: 'Bridal Party', color: '#EC4899' },
  { name: 'First Timer', color: '#2563EB' },
  { name: 'Event Lead', color: '#7C3AED' },
];

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  // Check if tags exist; if not, seed defaults
  const { data: existing } = await supabase
    .from('client_tags')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(1);

  if (!existing || existing.length === 0) {
    await supabase.from('client_tags').insert(
      DEFAULT_TAGS.map((t) => ({ tenant_id: tenantId, name: t.name, color: t.color }))
    );
  }

  // Return tags with usage count
  const { data: tags, error } = await supabase
    .from('client_tags')
    .select('*, client_tag_assignments(count)')
    .eq('tenant_id', tenantId)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (tags || []).map((tag: any) => ({
    id: tag.id,
    tenant_id: tag.tenant_id,
    name: tag.name,
    color: tag.color,
    created_at: tag.created_at,
    usage_count: tag.client_tag_assignments?.[0]?.count ?? 0,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { tenant_id, name, color } = body;

  if (!tenant_id || !name) {
    return NextResponse.json({ error: 'tenant_id and name required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('client_tags')
    .insert({
      tenant_id,
      name: name.trim(),
      color: color || '#6B7280',
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A tag with that name already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
