'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import Link from 'next/link';
import { Card, CardContent, Badge } from '@/components/ui';

interface DashboardStats {
  todaySales: number;
  todayRevenue: number;
  upcomingEvents: number;
  lowStockCount: number;
  queueWaiting: number;
}

export default function DashboardPage() {
  const { tenant, isLoading } = useTenant();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    todayRevenue: 0,
    upcomingEvents: 0,
    lowStockCount: 0,
    queueWaiting: 0,
  });
  const supabase = createClient();

  useEffect(() => {
    if (!tenant) return;

    const fetchStats = async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [salesRes, eventsRes, inventoryRes, queueRes] = await Promise.all([
        supabase
          .from('sales')
          .select('total')
          .eq('tenant_id', tenant.id)
          .eq('status', 'completed')
          .gte('created_at', today.toISOString()),
        supabase
          .from('events')
          .select('id')
          .eq('tenant_id', tenant.id)
          .gte('start_time', new Date().toISOString())
          .eq('is_active', true),
        supabase
          .from('inventory_items')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('is_active', true)
          .filter('quantity_on_hand', 'lte', 'reorder_threshold'),
        supabase
          .from('queue_entries')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('status', 'waiting'),
      ]);

      const sales = salesRes.data || [];
      setStats({
        todaySales: sales.length,
        todayRevenue: sales.reduce((sum, s) => sum + Number(s.total), 0),
        upcomingEvents: eventsRes.data?.length || 0,
        lowStockCount: inventoryRes.data?.length || 0,
        queueWaiting: queueRes.data?.length || 0,
      });
    };

    fetchStats();
  }, [tenant]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-text-tertiary">Loading…</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          Dashboard
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Welcome back to {tenant?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={stats.todaySales.toString()}
          subtitle={`$${stats.todayRevenue.toFixed(2)} revenue`}
          color="accent"
        />
        <StatCard
          label="Upcoming Events"
          value={stats.upcomingEvents.toString()}
          subtitle="scheduled"
          color="info"
        />
        <StatCard
          label="Low Stock"
          value={stats.lowStockCount.toString()}
          subtitle="items need reorder"
          color={stats.lowStockCount > 0 ? 'warning' : 'success'}
        />
        <StatCard
          label="Queue"
          value={stats.queueWaiting.toString()}
          subtitle="waiting"
          color="accent"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <QuickActionCard
            href="/dashboard/events"
            icon={<PlusIcon />}
            title="New Event"
            description="Create and configure an event"
            color="accent"
          />
          <QuickActionCard
            href="/dashboard/inventory"
            icon={<BoxIcon />}
            title="Manage Inventory"
            description="Add, restock, or adjust items"
            color="success"
          />
          <QuickActionCard
            href="/dashboard/clients"
            icon={<UsersIcon />}
            title="View Clients"
            description="Browse client list and waivers"
            color="info"
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Sub-components                                                            */
/* -------------------------------------------------------------------------- */

interface StatCardProps {
  label: string;
  value: string;
  subtitle: string;
  color: 'accent' | 'success' | 'warning' | 'info';
}

function StatCard({ label, value, subtitle, color }: StatCardProps) {
  const valueColorMap = {
    accent: 'text-accent-600',
    success: 'text-success-600',
    warning: 'text-warning-600',
    info: 'text-info-600',
  };

  return (
    <Card padding="md">
      <CardContent>
        <div className="text-xs font-medium uppercase tracking-wide text-text-tertiary mb-1">
          {label}
        </div>
        <div className={`text-3xl font-bold ${valueColorMap[color]}`}>
          {value}
        </div>
        <div className="text-xs text-text-tertiary mt-1">{subtitle}</div>
      </CardContent>
    </Card>
  );
}

interface QuickActionCardProps {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'accent' | 'success' | 'info';
}

function QuickActionCard({ href, icon, title, description, color }: QuickActionCardProps) {
  const iconBgMap = {
    accent: 'bg-accent-50 text-accent-600',
    success: 'bg-success-50 text-success-600',
    info: 'bg-info-50 text-info-600',
  };

  return (
    <Link href={href}>
      <Card variant="interactive" padding="md">
        <CardContent>
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-lg ${iconBgMap[color]} flex items-center justify-center shrink-0`}
            >
              {icon}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-text-primary">{title}</div>
              <div className="text-sm text-text-secondary">{description}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*  Icons                                                                     */
/* -------------------------------------------------------------------------- */

function PlusIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function BoxIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}