// ============================================================================
// Cash Drawer Transaction — POST (add transaction)
// src/app/api/cash-drawers/[id]/transaction/route.ts
// ============================================================================

export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
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

  // Verify drawer exists, belongs to tenant, and is open
  const { data: drawer } = await supabase
    .from('cash_drawers')
    .select('id, status')
    .eq('id', id)
    .eq('tenant_id', member.tenant_id)
    .single();

  if (!drawer) return NextResponse.json({ error: 'Cash drawer not found' }, { status: 404 });
  if (drawer.status !== 'open') {
    return NextResponse.json({ error: 'Cash drawer is closed. Open a new drawer first.' }, { status: 400 });
  }

  const { type, amount, note, saleId } = await request.json();

  if (!type || !['sale', 'tip', 'pay_in', 'pay_out', 'adjustment'].includes(type)) {
    return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
  }
  if (amount == null || amount <= 0) {
    return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
  }

  const { data: txn, error } = await supabase
    .from('cash_drawer_transactions')
    .insert({
      cash_drawer_id: id,
      sale_id: saleId || null,
      type,
      amount,
      note: note || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(txn, { status: 201 });
}
