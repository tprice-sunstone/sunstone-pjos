// ============================================================================
// External Ambassador Dashboard — src/app/ambassador/dashboard/page.tsx
// ============================================================================
// Standalone portal for external ambassadors (not Sunstone Studio artists).
// Has its own header/layout since it's outside the /dashboard layout.
// Auth check is client-side since /ambassador/* is a public middleware route.
// ============================================================================

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import AmbassadorDashboardContent from '@/components/ambassador/AmbassadorDashboardContent';

export default function ExternalAmbassadorDashboard() {
  return (
    <Suspense>
      <ExternalAmbassadorDashboardInner />
    </Suspense>
  );
}

function ExternalAmbassadorDashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authState, setAuthState] = useState<'loading' | 'unauthenticated' | 'no_ambassador' | 'active' | 'pending'>('loading');
  const [ambassadorName, setAmbassadorName] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const checkAuth = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthState('unauthenticated');
        return;
      }

      // Check ambassador record
      const res = await fetch('/api/ambassador/dashboard');
      if (!res.ok) {
        setAuthState('no_ambassador');
        return;
      }

      const data = await res.json();
      if (!data.ambassador) {
        setAuthState('no_ambassador');
        return;
      }

      if (data.ambassador.status === 'pending') {
        setAmbassadorName(data.ambassador.name);
        setAuthState('pending');
        return;
      }

      setAmbassadorName(data.ambassador.name);
      setAuthState('active');
    } catch {
      setAuthState('unauthenticated');
    }
  }, [supabase.auth]);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  // Handle ?connect=complete or ?connect=refresh from Stripe return
  useEffect(() => {
    const connectParam = searchParams.get('connect');
    if (!connectParam) return;

    if (connectParam === 'complete') {
      fetch('/api/ambassador/connect/status')
        .then((r) => r.json())
        .then((data) => {
          if (data.onboarded) {
            toast.success('Payouts connected! You\'ll receive monthly payouts on the 15th.');
            checkAuth();
          } else {
            toast.error('Payout setup is incomplete. Please try again.');
          }
        })
        .catch(() => toast.error('Failed to verify payout setup'));

      window.history.replaceState({}, '', '/ambassador/dashboard');
    } else if (connectParam === 'refresh') {
      toast('Please complete your payout setup to receive commissions.');
      window.history.replaceState({}, '', '/ambassador/dashboard');
    }
  }, [searchParams, checkAuth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/ambassador');
  };

  // ── Loading ──
  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-[#FDFBF9]">
        <Header />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-64" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl" />)}
            </div>
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // ── Not authenticated ──
  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#FDFBF9]">
        <Header />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FDF2F6] flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#B1275E]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Sign In to View Your Dashboard</h1>
          <p className="text-sm text-[#666] mb-8">
            Use the email you signed up with to access your ambassador dashboard.
          </p>
          <Link
            href="/auth/login?redirect=/ambassador/dashboard"
            className="inline-flex items-center justify-center h-12 px-8 bg-[#B1275E] hover:bg-[#952050] text-white font-semibold rounded-xl transition-colors"
          >
            Sign In
          </Link>
          <p className="text-sm text-[#999] mt-6">
            Not an ambassador yet?{' '}
            <Link href="/ambassador" className="text-[#B1275E] font-medium hover:underline">
              Apply here
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // ── No ambassador record ──
  if (authState === 'no_ambassador') {
    return (
      <div className="min-h-screen bg-[#FDFBF9]">
        <Header onSignOut={handleSignOut} />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">No Ambassador Account</h1>
          <p className="text-sm text-[#666] mb-8">
            This account isn&apos;t linked to an ambassador profile. Apply to join the program or sign in with a different email.
          </p>
          <Link
            href="/ambassador"
            className="inline-flex items-center justify-center h-12 px-8 bg-[#B1275E] hover:bg-[#952050] text-white font-semibold rounded-xl transition-colors"
          >
            Apply to Become an Ambassador
          </Link>
        </div>
      </div>
    );
  }

  // ── Pending approval ──
  if (authState === 'pending') {
    return (
      <div className="min-h-screen bg-[#FDFBF9]">
        <Header name={ambassadorName} onSignOut={handleSignOut} />
        <div className="max-w-md mx-auto px-4 py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] mb-2">Application Under Review</h1>
          <p className="text-sm text-[#666] mb-4">
            Thanks for applying, {ambassadorName.split(' ')[0]}! We&apos;re reviewing your application and will send you an email once approved.
          </p>
          <p className="text-xs text-[#999]">
            This usually takes less than 48 hours.
          </p>
        </div>
      </div>
    );
  }

  // ── Active ambassador — show full dashboard ──
  return (
    <div className="min-h-screen bg-[#FDFBF9]">
      <Header name={ambassadorName} onSignOut={handleSignOut} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a]">Ambassador Dashboard</h1>
          <p className="text-sm text-[#666] mt-1">Share your link and earn commission on referrals</p>
        </div>

        <AmbassadorDashboardContent />
      </div>
    </div>
  );
}

// ── Standalone Header ──

function Header({ name, onSignOut }: { name?: string; onSignOut?: () => void }) {
  return (
    <header className="bg-white border-b border-[#e8e3de]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="font-display text-xl font-bold text-[#B1275E] tracking-tight">
          Sunstone
        </Link>
        <div className="flex items-center gap-4">
          {name && (
            <span className="text-sm text-[#666] hidden sm:block">{name}</span>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="text-xs text-[#999] hover:text-[#666] font-medium min-h-[44px] px-2"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
