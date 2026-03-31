// ============================================================================
// Artist Ambassador Dashboard — src/app/dashboard/ambassador/page.tsx
// ============================================================================
// In-app ambassador page: enrollment CTA, referral dashboard, Stripe Connect
// onboarding, and pending earnings overview.
// ============================================================================

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { Button, Card } from '@/components/ui';
import { toast } from 'sonner';
import { format } from 'date-fns';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface AmbassadorData {
  id: string;
  type: string;
  status: string;
  name: string;
  referral_code: string;
  stripe_connect_onboarded: boolean;
  created_at: string;
}

interface ReferralData {
  id: string;
  status: string;
  attribution_source: string | null;
  created_at: string;
  signed_up_at: string | null;
  converted_at: string | null;
  total_commission_earned: number;
}

interface DashboardStats {
  totalClicks: number;
  totalSignups: number;
  totalConverted: number;
  totalEarned: number;
  totalPaid: number;
}

interface PendingCommissions {
  total: number;
  count: number;
}

export default function AmbassadorPage() {
  return (
    <Suspense>
      <AmbassadorPageInner />
    </Suspense>
  );
}

function AmbassadorPageInner() {
  const { tenant } = useTenant();
  const searchParams = useSearchParams();
  const [ambassador, setAmbassador] = useState<AmbassadorData | null>(null);
  const [referrals, setReferrals] = useState<ReferralData[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [pending, setPending] = useState<PendingCommissions>({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch('/api/ambassador/dashboard');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setAmbassador(data.ambassador);
      setReferrals(data.referrals || []);
      setStats(data.stats);
      setPending(data.pending || { total: 0, count: 0 });
    } catch {
      // Not enrolled — that's ok
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Handle ?connect=complete or ?connect=refresh from Stripe return
  useEffect(() => {
    const connectParam = searchParams.get('connect');
    if (!connectParam) return;

    if (connectParam === 'complete') {
      // Check if onboarding is actually complete
      fetch('/api/ambassador/connect/status')
        .then((r) => r.json())
        .then((data) => {
          if (data.onboarded) {
            toast.success('Payouts connected! You\'ll receive monthly payouts on the 15th.');
            loadData(); // Refresh to show updated state
          } else {
            toast.error('Payout setup is incomplete. Please try again.');
          }
        })
        .catch(() => toast.error('Failed to verify payout setup'));

      // Clean the URL
      window.history.replaceState({}, '', '/dashboard/ambassador');
    } else if (connectParam === 'refresh') {
      toast('Please complete your payout setup to receive commissions.');
      window.history.replaceState({}, '', '/dashboard/ambassador');
    }
  }, [searchParams, loadData]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch('/api/ambassador/enroll', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to enroll');
        return;
      }
      toast.success('Welcome to the Ambassador Program!');
      await loadData();
    } catch {
      toast.error('Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleConnectSetup = async () => {
    setConnectLoading(true);
    try {
      const res = await fetch('/api/ambassador/connect', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to start payout setup');
        return;
      }
      // Redirect to Stripe Connect onboarding
      window.location.href = data.url;
    } catch {
      toast.error('Failed to start payout setup');
    } finally {
      setConnectLoading(false);
    }
  };

  const handleConnectLogin = async () => {
    try {
      const res = await fetch('/api/ambassador/connect/login');
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to open payout dashboard');
        return;
      }
      window.open(data.url, '_blank');
    } catch {
      toast.error('Failed to open payout dashboard');
    }
  };

  const referralLink = ambassador
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://sunstonepj.app'}/join/${ambassador.referral_code}`
    : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate next payout date (15th of current or next month)
  const getNextPayoutDate = () => {
    const now = new Date();
    if (now.getDate() < 15) {
      return new Date(now.getFullYear(), now.getMonth(), 15);
    }
    return new Date(now.getFullYear(), now.getMonth() + 1, 15);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--surface-raised)] rounded w-64" />
          <div className="h-48 bg-[var(--surface-raised)] rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Not on a paid plan and not already an ambassador — show upgrade prompt ──
  const hasPaidPlan = tenant?.subscription_status === 'active' || !!tenant?.stripe_subscription_id;
  if (!ambassador && !hasPaidPlan) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ambassador Program</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Earn commission by referring PJ artists to Sunstone Studio</p>
        </div>

        <Card className="p-8 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-50)] flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-[var(--accent-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Upgrade to Unlock</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
              The Ambassador Program is available to artists on a paid Sunstone plan. Choose a plan to start earning commissions on referrals.
            </p>
          </div>
          <Link href="/dashboard/settings?tab=subscription">
            <Button variant="primary" size="lg" className="min-h-[48px]">
              View Plans
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  // ── Not enrolled — show invitation ──
  if (!ambassador) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ambassador Program</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Earn commission by referring PJ artists to Sunstone Studio</p>
        </div>

        <Card className="p-8 text-center space-y-6">
          {/* Gift icon */}
          <div className="w-16 h-16 rounded-full bg-[var(--accent-50)] flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-[var(--accent-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
            </svg>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Earn 20% Commission</h2>
            <p className="text-sm text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
              Share Sunstone Studio with other PJ artists and earn 20% of their monthly subscription for 8 months.
            </p>
          </div>

          {/* Commission table */}
          <div className="max-w-sm mx-auto">
            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden">
              <div className="grid grid-cols-3 gap-0 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider bg-[var(--surface-raised)] px-4 py-2">
                <div>Plan</div>
                <div className="text-right">Price</div>
                <div className="text-right">You Earn</div>
              </div>
              {[
                { plan: 'Starter', price: '$99', earn: '$19.80' },
                { plan: 'Pro', price: '$169', earn: '$33.80' },
                { plan: 'Business', price: '$279', earn: '$55.80' },
              ].map((row) => (
                <div key={row.plan} className="grid grid-cols-3 gap-0 px-4 py-2.5 border-t border-[var(--border-subtle)] text-sm">
                  <div className="text-[var(--text-primary)] font-medium">{row.plan}</div>
                  <div className="text-right text-[var(--text-secondary)]">{row.price}/mo</div>
                  <div className="text-right text-[var(--accent-600)] font-semibold">{row.earn}/mo</div>
                </div>
              ))}
            </div>
          </div>

          <Button variant="primary" size="lg" onClick={handleEnroll} loading={enrolling} className="min-h-[48px]">
            Become an Ambassador
          </Button>
        </Card>
      </div>
    );
  }

  // ── Enrolled — show dashboard ──
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Ambassador Program</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Share your link and earn commission on referrals</p>
      </div>

      {/* Stripe Connect Setup / Status */}
      {!ambassador.stripe_connect_onboarded ? (
        <Card className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-[var(--accent-50)] flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-[var(--accent-600)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Set Up Your Payouts</h3>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Connect your bank account to receive commission payments. Takes about 2 minutes.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConnectSetup}
                loading={connectLoading}
                className="mt-3 min-h-[44px]"
              >
                Connect Bank Account
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-[var(--text-primary)]">Payouts active — bank account connected</p>
            </div>
            <button
              onClick={handleConnectLogin}
              className="text-xs text-[var(--accent-600)] hover:text-[var(--accent-700)] font-medium min-h-[44px] px-3"
            >
              Manage payout settings
            </button>
          </div>
        </Card>
      )}

      {/* Referral Link Card */}
      <Card className="p-6 space-y-4">
        <div>
          <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Your Referral Link</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[var(--surface-base)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] truncate select-all">
              {referralLink}
            </div>
            <Button variant="primary" size="sm" onClick={copyLink} className="shrink-0 min-h-[44px]">
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </div>
        <div>
          <p className="text-xs text-[var(--text-tertiary)]">
            Referral Code: <span className="font-medium text-[var(--text-secondary)]">{ambassador.referral_code}</span>
          </p>
        </div>
      </Card>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Clicks', value: stats.totalClicks },
            { label: 'Signups', value: stats.totalSignups },
            { label: 'Converted', value: stats.totalConverted },
            { label: 'Earned', value: `$${stats.totalEarned.toFixed(2)}` },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wider">{s.label}</p>
              <p className="text-xl font-bold text-[var(--text-primary)] mt-1">{s.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Earnings Card */}
      {pending.total > 0 && (
        <Card className="p-6 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">Pending Earnings</p>
              <p className="text-2xl font-bold text-[var(--accent-600)] mt-1">${pending.total.toFixed(2)}</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                {pending.count} commission{pending.count !== 1 ? 's' : ''} pending
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-tertiary)]">Next payout</p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {format(getNextPayoutDate(), 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          {pending.total < 25 && (
            <p className="text-xs text-[var(--text-tertiary)] pt-1">
              Minimum payout: $25. Commissions below this threshold roll over to the next month.
            </p>
          )}
        </Card>
      )}

      {/* Referrals List */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Referrals</h3>
        </div>
        {referrals.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[var(--text-tertiary)]">
            No referrals yet. Share your link to get started!
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-subtle)]">
            {referrals.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                      r.status === 'converted' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      r.status === 'signed_up' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      r.status === 'clicked' ? 'bg-gray-50 text-gray-600 border-gray-200' :
                      r.status === 'churned' ? 'bg-red-50 text-red-600 border-red-200' :
                      r.status === 'expired' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                      {r.status.replace('_', ' ')}
                    </span>
                    {r.attribution_source && (
                      <span className="text-[11px] text-[var(--text-tertiary)]">{r.attribution_source.replace('_', ' ')}</span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                {Number(r.total_commission_earned) > 0 && (
                  <span className="text-sm font-medium text-[var(--accent-600)]">
                    ${Number(r.total_commission_earned).toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
