// src/lib/admin/verify-platform-admin.ts
// Shared helper for all admin API routes. Authenticates the current user
// and verifies they exist in the platform_admins table.

import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

export interface PlatformAdmin {
  id: string;
  email: string;
}

/**
 * Verify the current request is from a platform admin.
 * Returns the admin user on success, or throws a Response-ready error.
 *
 * Usage in API routes:
 *   const admin = await verifyPlatformAdmin();
 *   // if we get here, they're a verified platform admin
 */
export async function verifyPlatformAdmin(): Promise<PlatformAdmin> {
  // Step 1: Get the authenticated user via cookie-based session
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AdminAuthError('Not authenticated', 401);
  }

  // Step 2: Check platform_admins table via service role (bypasses RLS)
  const serviceClient = await createServiceRoleClient();
  const { data: adminRecord, error: adminError } = await serviceClient
    .from('platform_admins')
    .select('user_id')
    .eq('user_id', user.id)
    .single();

  if (adminError || !adminRecord) {
    throw new AdminAuthError('Not a platform admin', 403);
  }

  return {
    id: user.id,
    email: user.email || '',
  };
}

/**
 * Custom error class for admin auth failures.
 * Includes HTTP status code for easy conversion to NextResponse.
 */
export class AdminAuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminAuthError';
    this.status = status;
  }
}