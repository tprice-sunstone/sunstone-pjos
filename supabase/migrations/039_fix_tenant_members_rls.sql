-- ============================================================================
-- Migration 039: Fix tenant_members RLS infinite recursion
-- ============================================================================
-- The "Admins can manage tenant members" FOR ALL policy queries
-- tenant_members inside its own USING clause. Postgres detects the
-- recursion and returns zero rows, silently preventing admin/owner
-- staff management operations (invite, role change, removal).
--
-- Fix: Replace with a SECURITY DEFINER helper function that bypasses
-- RLS to check roles, plus separate per-operation policies.
--
-- Existing policies KEPT (no recursion):
--   "Members can view their tenant members" (SELECT, uses get_user_tenant_ids())
--   "Users can insert own membership" (INSERT, user_id = auth.uid())
-- ============================================================================

-- ── Step 1: Create SECURITY DEFINER helper ──────────────────────────────────
-- Bypasses RLS to check a user's role in a specific tenant without recursion.
CREATE OR REPLACE FUNCTION get_user_tenant_role(p_user_id uuid, p_tenant_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM tenant_members
  WHERE user_id = p_user_id AND tenant_id = p_tenant_id
  LIMIT 1;
$$;

-- ── Step 2: Drop the recursive policy ───────────────────────────────────────
DROP POLICY IF EXISTS "Admins can manage tenant members" ON tenant_members;

-- ── Step 3: Create non-recursive replacement policies ───────────────────────

-- INSERT: Owners and admins can invite new members
DROP POLICY IF EXISTS "Admins can invite members" ON tenant_members;
CREATE POLICY "Admins can invite members" ON tenant_members
  FOR INSERT WITH CHECK (
    get_user_tenant_role(auth.uid(), tenant_id) IN ('owner', 'admin')
  );

-- UPDATE: Owners and admins can update member roles
DROP POLICY IF EXISTS "Admins can update members" ON tenant_members;
CREATE POLICY "Admins can update members" ON tenant_members
  FOR UPDATE USING (
    get_user_tenant_role(auth.uid(), tenant_id) IN ('owner', 'admin')
  );

-- DELETE: Owners and admins can remove members (but not themselves)
DROP POLICY IF EXISTS "Admins can remove members" ON tenant_members;
CREATE POLICY "Admins can remove members" ON tenant_members
  FOR DELETE USING (
    get_user_tenant_role(auth.uid(), tenant_id) IN ('owner', 'admin')
    AND user_id != auth.uid()
  );
