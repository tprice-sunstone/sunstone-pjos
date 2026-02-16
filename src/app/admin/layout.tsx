// src/app/admin/layout.tsx
// Platform admin layout — separate from tenant dashboard.
// Uses neutral slate palette with amber accent for admin distinction.
// Server component: checks platform_admins table before rendering.

import { redirect } from 'next/navigation';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { AdminShell } from './admin-shell';

export const metadata = {
  title: 'Sunstone Admin',
  description: 'Platform administration panel',
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // ── Auth guard: must be logged in ──
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // ── Platform admin guard: must be in platform_admins table ──
  const serviceClient = await createServiceRoleClient();
  const { data: adminRecord } = await serviceClient
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (!adminRecord) {
    redirect('/dashboard');
  }

  return <AdminShell userEmail={user.email || ''}>{children}</AdminShell>;
}