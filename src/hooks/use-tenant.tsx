'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { hasPermission, type TenantRole, type Permission } from '@/lib/permissions';
import type { Tenant, TenantMember } from '@/types';

interface TenantContextValue {
  tenant: Tenant | null;
  membership: TenantMember | null;
  isLoading: boolean;
  /** Current user's effective role */
  role: TenantRole;
  /** Check if the current user has a specific permission */
  can: (permission: Permission) => boolean;
  /** Backward compat: true if admin or owner */
  isAdmin: boolean;
  /** True if role is manager */
  isManager: boolean;
  /** True if this user is the tenant owner (always full access) */
  isOwner: boolean;
  refetch: () => Promise<void>;
}

const TenantContext = createContext<TenantContextValue>({
  tenant: null,
  membership: null,
  isLoading: true,
  role: 'staff',
  can: () => false,
  isAdmin: false,
  isManager: false,
  isOwner: false,
  refetch: async () => {},
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [membership, setMembership] = useState<TenantMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  // Track whether we've already attempted invite acceptance this session
  const acceptAttempted = useRef(false);

  const fetchTenant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }

      setUserId(user.id);

      // ──────────────────────────────────────────────────────────
      // Auto-accept pending team invites (fire-and-forget)
      // This is a no-op if there are no pending invites for this
      // user's email, so it's safe to call every time.
      // ──────────────────────────────────────────────────────────
      if (!acceptAttempted.current) {
        acceptAttempted.current = true;
        fetch('/api/team/accept', { method: 'POST' }).catch(() => {
          // Silently ignore — invite acceptance is best-effort
        });
      }

      // Check membership first
      const { data: memberData } = await supabase
        .from('tenant_members')
        .select('*, tenants(*)')
        .eq('user_id', user.id)
        .limit(1)
        .single();

      if (memberData) {
        setMembership(memberData as unknown as TenantMember);
        setTenant((memberData as any).tenants as Tenant);
      } else {
        // Check if owner (edge case: owner without membership row)
        const { data: ownedTenant } = await supabase
          .from('tenants')
          .select('*')
          .eq('owner_id', user.id)
          .limit(1)
          .single();

        if (ownedTenant) {
          setTenant(ownedTenant as Tenant);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tenant:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTenant(); }, []);

  // Derive role and permissions
  const isOwner = !!(tenant && userId && tenant.owner_id === userId);
  const memberRole = membership?.role as TenantRole | undefined;

  // Owner always gets admin-level access regardless of their membership role
  const effectiveRole: TenantRole = isOwner ? 'admin' : (memberRole || 'staff');

  const isAdmin = effectiveRole === 'admin';
  const isManager = effectiveRole === 'manager';

  const can = useCallback(
    (permission: Permission): boolean => {
      // Owner always has all permissions
      if (isOwner) return true;
      return hasPermission(effectiveRole, permission);
    },
    [effectiveRole, isOwner]
  );

  return (
    <TenantContext.Provider
      value={{
        tenant,
        membership,
        isLoading,
        role: effectiveRole,
        can,
        isAdmin,
        isManager,
        isOwner,
        refetch: fetchTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => useContext(TenantContext);