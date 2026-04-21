// ============================================================================
// Dashboard Layout (Server Wrapper) — src/app/dashboard/layout.tsx
// ============================================================================
// Server component that checks onboarding status BEFORE rendering the client
// shell. Prevents the dashboard flash-before-redirect for new users.
// ============================================================================

import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import DashboardClientLayout from '@/components/dashboard/DashboardClientLayout';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If not authenticated, middleware handles the redirect — but guard just in case
  if (!user) {
    redirect('/auth/login');
  }

  // Check if the user's tenant has completed onboarding
  const { data: member } = await supabase
    .from('tenant_members')
    .select('tenant_id, tenants(onboarding_completed)')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  const tenant = (member as any)?.tenants;

  // No tenant or onboarding not complete → redirect before any HTML renders
  if (!tenant || !tenant.onboarding_completed) {
    redirect('/onboarding');
  }

  return <DashboardClientLayout>{children}</DashboardClientLayout>;
}
