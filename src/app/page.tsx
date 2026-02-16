// src/app/page.tsx
// Root route — redirects based on auth status and platform admin flag

import { redirect } from 'next/navigation';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

export default async function Home() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if this user is a platform admin
  const serviceClient = await createServiceRoleClient();
  const { data: adminRecord } = await serviceClient
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (adminRecord) {
    redirect('/admin');
  }

  redirect('/dashboard');
}