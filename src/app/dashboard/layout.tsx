// ============================================================================
// Dashboard Layout v5 — src/app/dashboard/layout.tsx
// ============================================================================
// v2: Permission-based nav visibility
// v4: Added platform admin link in sidebar + mobile nav
// v5: Added MentorChat (Ask Sunny) floating button + chat panel
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { TenantProvider, useTenant } from '@/hooks/use-tenant';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Permission } from '@/lib/permissions';
import MentorChat from '@/components/MentorChat';
import { getSubscriptionTier, isTrialActive } from '@/lib/subscription';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** If set, nav item only shows when user has this permission */
  requirePermission?: Permission;
  /** If true, only show for Pro/Business tiers (not Starter) */
  requirePro?: boolean;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/dashboard/events', label: 'Events', icon: EventsIcon },
  { href: '/dashboard/inventory', label: 'Inventory', icon: InventoryIcon },
  { href: '/dashboard/clients', label: 'Clients', icon: ClientsIcon },
  { href: '/dashboard/templates', label: 'Templates', icon: TemplatesIcon, requirePro: true },
  { href: '/dashboard/broadcasts', label: 'Broadcasts', icon: BroadcastsIcon, requirePro: true },
  { href: '/dashboard/queue', label: 'Queue', icon: QueueIcon },
  { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon, requirePermission: 'settings:manage' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <div className="flex h-screen overflow-hidden bg-surface-base">
        {/* Desktop sidebar — hidden on mobile */}
        <DesktopSidebar />

        {/* Main content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile top bar */}
          <MobileTopBar />

          {/* Trial expiry banner */}
          <TrialBanner />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
              {children}
            </div>
          </main>

          {/* Mobile bottom nav */}
          <MobileBottomNav />
        </div>
      </div>

      {/* Mentor Chat — available on every dashboard page */}
      <MentorChat />
    </TenantProvider>
  );
}

// ============================================================================
// Hook to filter nav items by permission
// ============================================================================

function useVisibleNavItems() {
  const { can, tenant } = useTenant();

  const isProOrAbove = (() => {
    if (!tenant) return false;
    if (tenant.subscription_status === 'active' && (tenant.subscription_tier === 'pro' || tenant.subscription_tier === 'business')) return true;
    if (tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date()) return true;
    return false;
  })();

  return navItems.filter((item) => {
    if (item.requirePermission && !can(item.requirePermission)) return false;
    if (item.requirePro && !isProOrAbove) return false;
    return true;
  });
}

// ============================================================================
// Hook to check platform admin status
// ============================================================================

function useIsPlatformAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch('/api/admin/check');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setIsAdmin(data.isAdmin === true);
        }
      } catch {
        // Silently fail — admin link just won't show
      }
    }

    check();
    return () => { cancelled = true; };
  }, []);

  return isAdmin;
}

// ============================================================================
// Trial Expiry Banner
// ============================================================================
// Shows in two cases:
// 1. Trial active but ≤7 days remaining → "Your Pro trial ends in X days"
// 2. Trial expired + on Starter tier → "Your Pro trial has ended"
// Dismissible per-session. Hidden once they have an active subscription.
// ============================================================================

function TrialBanner() {
  const { tenant } = useTenant();
  const [dismissed, setDismissed] = useState(false);

  if (!tenant || dismissed) return null;

  const effectiveTier = getSubscriptionTier(tenant);
  const trialActive = isTrialActive(tenant);
  const hasActiveSubscription =
    tenant.subscription_status === 'active' || tenant.subscription_status === 'trialing';

  // Don't show banner if they have an active paid subscription
  if (hasActiveSubscription && tenant.subscription_status !== 'trialing') return null;

  // Case 1: Trial still active but running out (≤7 days)
  if (trialActive && tenant.trial_ends_at) {
    const trialEnd = new Date(tenant.trial_ends_at);
    const now = new Date();
    const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 7) return null; // Only show in last 7 days

    return (
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            <span className="font-medium">Your Pro trial ends in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}.</span>{' '}
            Upgrade to keep full access to reports, AI insights, and team features.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Link
            href="/dashboard/settings?tab=subscription"
            className="text-sm font-medium text-amber-800 hover:text-amber-900 underline underline-offset-2"
          >
            View Plans
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-400 hover:text-amber-600 p-1"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Case 2: Trial has expired and they're on Starter
  if (!trialActive && effectiveTier === 'starter' && tenant.trial_ends_at) {
    const trialEnd = new Date(tenant.trial_ends_at);
    const now = new Date();
    const daysSinceExpiry = Math.floor((now.getTime() - trialEnd.getTime()) / (1000 * 60 * 60 * 24));

    // Stop showing after 30 days
    if (daysSinceExpiry > 30) return null;

    return (
      <div className="bg-surface-raised border-b border-border-default px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <svg className="w-4 h-4 shrink-0 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span>
            <span className="font-medium text-text-primary">Your Pro trial has ended.</span>{' '}
            Upgrade anytime to unlock reports, AI insights, and more.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <Link
            href="/dashboard/settings?tab=subscription"
            className="text-sm font-medium text-accent-600 hover:text-accent-700 underline underline-offset-2"
          >
            View Plans
          </Link>
          <button
            onClick={() => setDismissed(true)}
            className="text-text-tertiary hover:text-text-secondary p-1"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================================
// Tenant Logo Component (shared between sidebar & mobile)
// ============================================================================

function TenantLogo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const { tenant } = useTenant();
  const [imgError, setImgError] = useState(false);

  const dims = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const radius = size === 'sm' ? 'rounded-md' : 'rounded-lg';
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  if (tenant?.logo_url && !imgError) {
    return (
      <div className={cn(dims, radius, 'relative overflow-hidden shrink-0 bg-surface-raised')}>
        <Image
          src={tenant.logo_url}
          alt={tenant.name || 'Logo'}
          fill
          className="object-contain"
          onError={() => setImgError(true)}
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={cn(
      dims, radius,
      'bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shrink-0 shadow-sm'
    )}>
      <span className={cn('text-white font-bold', textSize)}>
        {tenant?.name?.charAt(0) || 'S'}
      </span>
    </div>
  );
}

// ============================================================================
// Desktop Sidebar (lg+ only)
// ============================================================================

function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant, role } = useTenant();
  const supabase = createClient();
  const visibleItems = useVisibleNavItems();
  const isPlatformAdmin = useIsPlatformAdmin();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <aside className="hidden lg:flex w-64 bg-[var(--surface-sidebar)] border-r border-border-default flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-border-default">
        <div className="flex items-center gap-2.5">
          <TenantLogo size="md" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">Sunstone</div>
            <div className="text-xs text-text-tertiary truncate">{tenant?.name || 'Loading…'}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] border-l-3 border-[var(--nav-active-border)]'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised'
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-border-default">
        {/* Platform Admin link */}
        {isPlatformAdmin && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-sm font-medium text-amber-700 hover:bg-amber-50 transition-colors mb-1"
          >
            <AdminShieldIcon className="w-5 h-5 shrink-0" />
            <span>Platform Admin</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-semibold">
              Admin
            </span>
          </Link>
        )}

        {/* Role indicator */}
        <div className="px-3 mb-2 text-[10px] uppercase tracking-wider text-text-tertiary font-medium">
          {role === 'admin' ? 'Admin' : role === 'manager' ? 'Manager' : 'Staff'}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 min-h-[48px] rounded-lg text-sm text-text-tertiary hover:text-text-primary hover:bg-surface-raised w-full transition-colors"
        >
          <LogoutIcon className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

// ============================================================================
// Mobile Top Bar (below lg)
// ============================================================================

function MobileTopBar() {
  const { tenant } = useTenant();

  return (
    <div className="lg:hidden flex items-center gap-3 px-4 h-14 bg-surface-base border-b border-border-default shrink-0">
      <TenantLogo size="sm" />
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate">
          {tenant?.name || 'Sunstone'}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Mobile Bottom Navigation (below lg)
// ============================================================================

function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const visibleItems = useVisibleNavItems();
  const isPlatformAdmin = useIsPlatformAdmin();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <nav className="lg:hidden flex items-stretch bg-surface-base border-t border-border-default shrink-0 px-1 safe-area-bottom">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors',
              isActive
                ? 'text-accent-600'
                : 'text-text-tertiary'
            )}
          >
            <item.icon className="w-5 h-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      {/* Platform Admin link on mobile */}
      {isPlatformAdmin && (
        <Link
          href="/admin"
          className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium text-amber-600 transition-colors"
        >
          <AdminShieldIcon className="w-5 h-5" />
          <span>Admin</span>
        </Link>
      )}
    </nav>
  );
}

// ============================================================================
// Icons (inline SVG for zero dependencies)
// ============================================================================

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function EventsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function InventoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function ClientsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function TemplatesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function BroadcastsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
    </svg>
  );
}

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

function AdminShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}