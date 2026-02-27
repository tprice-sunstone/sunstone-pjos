// ============================================================================
// Dashboard Home — src/app/dashboard/page.tsx
// ============================================================================
// Phase D3 v2: Pixel-perfect smart dashboard matching DashboardMock design.
// Cards are generated from real data via /api/dashboard/cards.
// ============================================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { useRouter } from 'next/navigation';
import { DashboardCardGrid } from '@/components/dashboard';
import type { DashboardCard } from '@/types';
import { format } from 'date-fns';

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { tenant, isLoading: tenantLoading } = useTenant();
  const router = useRouter();

  const [cards, setCards] = useState<DashboardCard[]>([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [eventsThisWeek, setEventsThisWeek] = useState<number>(0);

  // ── Fetch dashboard cards ──────────────────────────────────────────────
  const fetchCards = useCallback(async (refresh = false) => {
    setCardsLoading(true);
    try {
      const url = refresh ? '/api/dashboard/cards?refresh=1' : '/api/dashboard/cards';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch cards');
      const data = await res.json();
      setCards(data.cards || []);
    } catch (err) {
      console.error('Failed to fetch dashboard cards:', err);
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, []);

  // ── Fetch events-this-week count for subtitle ──────────────────────────
  useEffect(() => {
    if (!tenant?.id) return;

    fetchCards();

    // Quick client-side query for the subtitle context
    const fetchContext = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const now = new Date();
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + mondayOffset);
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const { count } = await supabase
          .from('events')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenant.id)
          .gte('start_time', weekStart.toISOString())
          .lt('start_time', weekEnd.toISOString());

        setEventsThisWeek(count || 0);
      } catch {
        // Non-critical
      }
    };

    fetchContext();
  }, [tenant?.id, fetchCards]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="py-20 text-center">
        <p className="text-text-secondary">No business found. Please complete setup.</p>
      </div>
    );
  }

  // ── Greeting ───────────────────────────────────────────────────────────
  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Use tenant name as display name (first word as first name feel)
  const displayName = tenant.name.split(' ')[0] || tenant.name;

  // Date context subtitle
  const dateStr = format(now, 'EEEE, MMM d');
  const contextStr = eventsThisWeek > 0
    ? `${eventsThisWeek} event${eventsThisWeek !== 1 ? 's' : ''} this week`
    : 'No events this week';

  return (
    <div style={{ maxWidth: 900 }}>
      {/* ================================================================ */}
      {/* Header: Greeting + Open POS                                      */}
      {/* ================================================================ */}
      <div className="flex items-start justify-between" style={{ marginBottom: 24 }}>
        <div>
          <h1
            className="text-text-primary"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 26,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {greeting}, {displayName}
          </h1>
          <p
            className="text-text-secondary"
            style={{ fontSize: 13, marginTop: 4 }}
          >
            {dateStr} &mdash; {contextStr}
          </p>
        </div>

        {/* Open POS button */}
        <button
          onClick={() => router.push('/dashboard/pos')}
          className="bg-accent-500 text-[var(--text-on-accent)] hover:bg-accent-600 transition-colors flex items-center gap-2 shrink-0"
          style={{
            fontSize: 12,
            fontWeight: 600,
            padding: '8px 16px',
            borderRadius: 10,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <RegisterIcon />
          Open POS
        </button>
      </div>

      {/* ================================================================ */}
      {/* Card Grid                                                        */}
      {/* ================================================================ */}
      <DashboardCardGrid
        cards={cards}
        loading={cardsLoading}
        tenantName={tenant.name}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function RegisterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
