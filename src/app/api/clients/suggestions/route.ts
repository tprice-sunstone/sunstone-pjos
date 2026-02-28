import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

interface Suggestion {
  client_id: string;
  client_name: string;
  initials: string;
  suggestion: string;
  type: 'lapsed' | 'birthday' | 'new_lead' | 'event_follow_up';
}

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tenantId = request.nextUrl.searchParams.get('tenantId');
  if (!tenantId) return NextResponse.json({ error: 'tenantId required' }, { status: 400 });

  const suggestions: Suggestion[] = [];
  const now = new Date();

  // 1. Upcoming birthdays (within next 14 days)
  const { data: birthdayClients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, birthday')
    .eq('tenant_id', tenantId)
    .not('birthday', 'is', null);

  if (birthdayClients) {
    for (const c of birthdayClients) {
      if (!c.birthday) continue;
      const bday = new Date(c.birthday + 'T00:00:00');
      const thisYearBday = new Date(now.getFullYear(), bday.getMonth(), bday.getDate());
      // If birthday already passed this year, check next year
      if (thisYearBday < now) thisYearBday.setFullYear(thisYearBday.getFullYear() + 1);
      const daysUntil = Math.ceil((thisYearBday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntil <= 14) {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
        suggestions.push({
          client_id: c.id,
          client_name: name,
          initials: `${(c.first_name?.[0] || '').toUpperCase()}${(c.last_name?.[0] || '').toUpperCase()}`,
          suggestion: daysUntil === 0 ? 'Birthday today!' : `Birthday in ${daysUntil} day${daysUntil !== 1 ? 's' : ''}`,
          type: 'birthday',
        });
      }
    }
  }

  // 2. Lapsed clients (last_visit_at > 90 days ago, have at least one sale)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const { data: lapsedClients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, last_visit_at')
    .eq('tenant_id', tenantId)
    .not('last_visit_at', 'is', null)
    .lt('last_visit_at', ninetyDaysAgo)
    .limit(10);

  if (lapsedClients) {
    for (const c of lapsedClients) {
      if (!c.last_visit_at) continue;
      const daysSince = Math.floor((now.getTime() - new Date(c.last_visit_at).getTime()) / (1000 * 60 * 60 * 24));
      const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
      suggestions.push({
        client_id: c.id,
        client_name: name,
        initials: `${(c.first_name?.[0] || '').toUpperCase()}${(c.last_name?.[0] || '').toUpperCase()}`,
        suggestion: `Haven't visited in ${daysSince} days`,
        type: 'lapsed',
      });
    }
  }

  // 3. New leads (created in last 7 days, zero sales)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: newClients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, created_at')
    .eq('tenant_id', tenantId)
    .gte('created_at', sevenDaysAgo)
    .limit(10);

  if (newClients) {
    for (const c of newClients) {
      // Check if they have any sales
      const { count } = await supabase
        .from('sales')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', c.id)
        .eq('status', 'completed');

      if ((count || 0) === 0) {
        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim();
        suggestions.push({
          client_id: c.id,
          client_name: name,
          initials: `${(c.first_name?.[0] || '').toUpperCase()}${(c.last_name?.[0] || '').toUpperCase()}`,
          suggestion: 'New client — no purchase yet',
          type: 'new_lead',
        });
      }
    }
  }

  // Deduplicate by client_id (keep highest priority)
  const priorityOrder: Record<string, number> = { birthday: 0, lapsed: 1, event_follow_up: 2, new_lead: 3 };
  suggestions.sort((a, b) => priorityOrder[a.type] - priorityOrder[b.type]);

  const seen = new Set<string>();
  const deduped: Suggestion[] = [];
  for (const s of suggestions) {
    if (!seen.has(s.client_id)) {
      seen.add(s.client_id);
      deduped.push(s);
    }
  }

  return NextResponse.json(deduped.slice(0, 6));
}
