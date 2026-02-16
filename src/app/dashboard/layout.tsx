// ============================================================================
// Dashboard Layout v3 — src/app/dashboard/layout.tsx
// ============================================================================
// Added Reports nav item (reports:view permission required)
// ============================================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { TenantProvider, useTenant } from '@/hooks/use-tenant';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Permission } from '@/lib/permissions';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requirePermission?: Permission;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { href: '/dashboard/events', label: 'Events', icon: EventsIcon },
  { href: '/dashboard/inventory', label: 'Inventory', icon: InventoryIcon },
  { href: '/dashboard/clients', label: 'Clients', icon: ClientsIcon },
  { href: '/dashboard/queue', label: 'Queue', icon: QueueIcon },
  { href: '/dashboard/reports', label: 'Reports', icon: ReportsIcon, requirePermission: 'reports:view' },
  { href: '/dashboard/settings', label: 'Settings', icon: SettingsIcon, requirePermission: 'settings:manage' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantProvider>
      <div className="flex h-screen overflow-hidden bg-surface-base">
        <DesktopSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <MobileTopBar />
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 lg:p-8 max-w-7xl mx-auto pb-24 lg:pb-8">
              {children}
            </div>
          </main>
          <MobileBottomNav />
        </div>
      </div>
    </TenantProvider>
  );
}

// ============================================================================
// Hook to filter nav items by permission
// ============================================================================

function useVisibleNavItems() {
  const { can } = useTenant();
  return navItems.filter((item) => {
    if (!item.requirePermission) return true;
    return can(item.requirePermission);
  });
}

// ============================================================================
// Tenant Logo Component
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
// Desktop Sidebar
// ============================================================================

function DesktopSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { tenant, role } = useTenant();
  const supabase = createClient();
  const visibleItems = useVisibleNavItems();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <aside className="hidden lg:flex w-64 bg-[var(--surface-sidebar)] border-r border-border-default flex-col shrink-0">
      <div className="px-5 py-5 border-b border-border-default">
        <div className="flex items-center gap-2.5">
          <TenantLogo size="md" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-text-primary truncate">Sunstone</div>
            <div className="text-xs text-text-tertiary truncate">{tenant?.name || 'Loading…'}</div>
          </div>
        </div>
      </div>

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

      <div className="px-3 py-4 border-t border-border-default">
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
// Mobile Top Bar
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
// Mobile Bottom Navigation
// ============================================================================

function MobileBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const visibleItems = useVisibleNavItems();

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
    </nav>
  );
}

// ============================================================================
// Icons
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

function QueueIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}

function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
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