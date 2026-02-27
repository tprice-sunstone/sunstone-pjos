// ============================================================================
// Dashboard Home — src/app/dashboard/page.tsx
// ============================================================================
// Phase D3 v3: Smart dashboard with debug panel + improved content strategy.
// Cards are generated from real data via /api/dashboard/cards.
// ============================================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown> | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  // ── Fallback cards — shown if API fails or returns nothing ────────────
  const clientFallbackCards: DashboardCard[] = [
    {
      type: 'revenue_snapshot',
      priority: 5,
      data: {
        monthRevenue: 0,
        lastMonthRevenue: 0,
        pctChange: null,
        salesCount: 0,
        eventsCount: 0,
        dailyBars: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
    },
    {
      type: 'sunstone_product',
      priority: 50,
      data: {
        title: 'Set Up Your Inventory',
        body: 'Add your chains, charms, and supplies to start tracking stock and pricing products automatically.',
        actionLabel: 'Add Inventory',
        actionRoute: '/dashboard/inventory',
      },
    },
  ];

  // ── Fetch dashboard cards ──────────────────────────────────────────────
  const fetchCards = useCallback(async (refresh = false) => {
    setCardsLoading(true);
    try {
      const url = refresh ? '/api/dashboard/cards?refresh=1' : '/api/dashboard/cards';
      const res = await fetch(url);
      const data = await res.json();
      const fetched = Array.isArray(data?.cards) ? data.cards : [];

      // Store full API response for debug panel
      setDebugInfo({
        status: res.status,
        cached: data?.cached ?? false,
        fallback: data?.fallback ?? false,
        cardCount: fetched.length,
        cardTypes: fetched.map((c: DashboardCard) => c.type),
        fetchedAt: new Date().toISOString(),
      });

      setCards(fetched.length > 0 ? fetched : clientFallbackCards);
    } catch (err) {
      console.error('Failed to fetch dashboard cards:', err);
      setDebugInfo({
        status: 'error',
        error: String(err),
        cardCount: 0,
        cardTypes: [],
        fetchedAt: new Date().toISOString(),
      });
      setCards(clientFallbackCards);
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
      {/* Debug Panel (collapsible)                                        */}
      {/* ================================================================ */}
      <div style={{ marginBottom: showDebug ? 16 : 0 }}>
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="text-text-tertiary hover:text-text-secondary transition-colors"
          style={{
            fontSize: 10,
            fontWeight: 500,
            background: 'none',
            border: 'none',
            padding: '2px 0',
            cursor: 'pointer',
            marginBottom: showDebug ? 6 : 0,
          }}
        >
          {showDebug ? 'Hide' : 'Show'} Debug Info
        </button>

        {showDebug && debugInfo && (
          <div
            className="border border-[var(--border-default)] bg-[var(--surface-subtle)] text-text-secondary"
            style={{
              borderRadius: 8,
              padding: 12,
              fontSize: 11,
              fontFamily: 'monospace',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            <div><strong className="text-text-primary">API Status:</strong> {String(debugInfo.status)}</div>
            <div><strong className="text-text-primary">Cached:</strong> {String(debugInfo.cached)}</div>
            <div><strong className="text-text-primary">Fallback:</strong> {String(debugInfo.fallback)}</div>
            <div><strong className="text-text-primary">Card Count:</strong> {String(debugInfo.cardCount)}</div>
            <div><strong className="text-text-primary">Card Types:</strong> {JSON.stringify(debugInfo.cardTypes)}</div>
            <div><strong className="text-text-primary">Fetched At:</strong> {String(debugInfo.fetchedAt)}</div>
            <div style={{ marginTop: 8 }}>
              <strong className="text-text-primary">Full Card Data:</strong>
              <pre style={{ marginTop: 4, fontSize: 10, maxHeight: 200, overflow: 'auto' }}>
                {JSON.stringify(cards, null, 2)}
              </pre>
            </div>
            <button
              onClick={() => fetchCards(true)}
              className="bg-accent-500 text-[var(--text-on-accent)] hover:bg-accent-600 transition-colors"
              style={{
                fontSize: 10,
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                marginTop: 8,
              }}
            >
              Force Refresh
            </button>
          </div>
        )}
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
