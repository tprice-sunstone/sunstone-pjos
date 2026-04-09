// src/lib/admin/verify-platform-admin.ts
// Shared helper for all admin API routes. Authenticates the current user
// and verifies they exist in the platform_admins table.

import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';

export interface PlatformAdmin {
  id: string;
  email: string;
  role: string;
}

export const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  marketing: 2,
  support: 2,
  viewer: 1,
};

export const VALID_ROLES = ['super_admin', 'admin', 'marketing', 'support', 'viewer'];

/**
 * Verify the current request is from a platform admin.
 * Returns the admin user (with role) on success, or throws a Response-ready error.
 */
export async function verifyPlatformAdmin(): Promise<PlatformAdmin> {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new AdminAuthError('Not authenticated', 401);
  }

  const serviceClient = await createServiceRoleClient();
  const { data: adminRecord, error: adminError } = await serviceClient
    .from('platform_admins')
    .select('user_id, role')
    .eq('user_id', user.id)
    .single();

  if (adminError || !adminRecord) {
    throw new AdminAuthError('Not a platform admin', 403);
  }

  return {
    id: user.id,
    email: user.email || '',
    role: adminRecord.role || 'super_admin',
  };
}

/**
 * Verify the current user has at least the given minimum role.
 * Throws 403 if insufficient permissions.
 */
export async function verifyAdminRole(minimumRole: string): Promise<PlatformAdmin> {
  const admin = await verifyPlatformAdmin();
  const userLevel = ROLE_HIERARCHY[admin.role] ?? 0;
  const requiredLevel = ROLE_HIERARCHY[minimumRole] ?? 0;

  if (userLevel < requiredLevel) {
    throw new AdminAuthError('Insufficient permissions', 403);
  }

  return admin;
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
