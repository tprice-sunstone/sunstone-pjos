// ============================================================================
// Permissions Helper — src/lib/permissions.ts
// ============================================================================
// Client-safe module (no secrets). Defines the role-permission matrix
// and provides helper functions for checking permissions.
// Import anywhere: import { hasPermission, type Permission } from '@/lib/permissions';
// ============================================================================

export type TenantRole = 'admin' | 'manager' | 'staff';

export type Permission =
  | 'pos:use'
  | 'queue:manage'
  | 'inventory:view'
  | 'inventory:edit'
  | 'inventory:delete'
  | 'events:view'
  | 'events:edit'
  | 'events:delete'
  | 'clients:view'
  | 'clients:edit'
  | 'reports:view'
  | 'settings:manage'
  | 'payments:connect'
  | 'team:manage'
  | 'discounts:apply'
  | 'sales:refund';

const ROLE_PERMISSIONS: Record<TenantRole, Permission[]> = {
  admin: [
    'pos:use',
    'queue:manage',
    'inventory:view',
    'inventory:edit',
    'inventory:delete',
    'events:view',
    'events:edit',
    'events:delete',
    'clients:view',
    'clients:edit',
    'reports:view',
    'settings:manage',
    'payments:connect',
    'team:manage',
    'discounts:apply',
    'sales:refund',
  ],
  manager: [
    'pos:use',
    'queue:manage',
    'inventory:view',
    'inventory:edit',
    'events:view',
    'events:edit',
    'clients:view',
    'clients:edit',
    'reports:view',
    'discounts:apply',
    'sales:refund',
  ],
  staff: [
    'pos:use',
    'queue:manage',
    'inventory:view',
    'events:view',
    'clients:view',
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: TenantRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ANY of the given permissions.
 */
export function hasAnyPermission(role: TenantRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Check if a role has ALL of the given permissions.
 */
export function hasAllPermissions(role: TenantRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/**
 * Get all permissions for a role.
 */
export function getPermissions(role: TenantRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Role display labels and colors for UI.
 */
export const ROLE_CONFIG: Record<TenantRole, { label: string; variant: 'accent' | 'info' | 'default' }> = {
  admin: { label: 'Admin', variant: 'accent' },
  manager: { label: 'Manager', variant: 'info' },
  staff: { label: 'Staff', variant: 'default' },
};