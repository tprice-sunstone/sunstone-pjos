// ============================================================================
// Party Message Detail API — PATCH /api/party-messages/[id]
// ============================================================================
// Cancel a scheduled party message.
// ============================================================================

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();

  if (body.status === 'cancelled') {
    const { data, error } = await supabase
      .from('party_scheduled_messages')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('status', 'pending')
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to cancel message' }, { status: 500 });
    }

    return NextResponse.json({ message: data });
  }

  return NextResponse.json({ error: 'Only cancellation is supported' }, { status: 400 });
}
