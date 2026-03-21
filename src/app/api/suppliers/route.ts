// ============================================================================
// Suppliers API — src/app/api/suppliers/route.ts
// ============================================================================
// CRUD for suppliers table. GET returns all for tenant. POST creates new.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (!member) return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
  const tenantId = member.tenant_id;

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order')
    .order('name');

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', user.id)
    .limit(1)
    .single();
  if (!member) return NextResponse.json({ error: 'No tenant membership' }, { status: 403 });
  const tenantId = member.tenant_id;

  const body = await request.json();
  const {
    name, contact_name, contact_email, contact_phone, website, notes,
    street, city, state, postal_code, country,
    instagram, facebook, tiktok, account_number,
  } = body;

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  }

  // Check for existing supplier with same name to prevent duplicates
  const { data: existing } = await supabase
    .from('suppliers')
    .select('*')
    .eq('tenant_id', tenantId)
    .ilike('name', name.trim())
    .limit(1)
    .single();
  if (existing) return NextResponse.json(existing);

  // Auto-prepend https:// to bare domain
  let cleanWebsite = website?.trim() || null;
  if (cleanWebsite && !/^https?:\/\//i.test(cleanWebsite)) {
    cleanWebsite = `https://${cleanWebsite}`;
  }

  const { data, error } = await supabase
    .from('suppliers')
    .insert({
      tenant_id: tenantId,
      name: name.trim(),
      contact_name: contact_name || null,
      contact_email: contact_email || null,
      contact_phone: contact_phone || null,
      website: cleanWebsite,
      street: street || null,
      city: city || null,
      state: state || null,
      postal_code: postal_code || null,
      country: country || null,
      instagram: instagram?.replace(/^@/, '') || null,
      facebook: facebook || null,
      tiktok: tiktok?.replace(/^@/, '') || null,
      account_number: account_number || null,
      notes: notes || null,
      is_sunstone: false,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
