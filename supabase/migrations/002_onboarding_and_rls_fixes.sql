-- ============================================================================
-- Migration 002: Onboarding Fields + RLS Policy Fixes
-- ============================================================================
-- Run in Supabase SQL Editor AFTER 001_initial_schema.sql
-- 
-- CHANGES:
-- 1. Add onboarding-related columns to tenants table
-- 2. Add missing DELETE policies on sales, sale_items, queue_entries, clients
-- 3. Add INSERT policy for tenant_members (signup flow needs it)
-- ============================================================================

-- ============================================================================
-- SCHEMA CHANGES: tenants table
-- ============================================================================

-- Add business_type column (for onboarding step 1)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS business_type text;

-- Add phone column (for onboarding step 1)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone text;

-- Add website column (for onboarding step 1)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website text;

-- Add default_tax_rate column (for onboarding step 3)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_tax_rate numeric(6,4) DEFAULT 0;

-- Add onboarding_completed flag
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- ============================================================================
-- RLS POLICY FIXES
-- ============================================================================

-- 1. TENANT_MEMBERS: Need INSERT policy for signup flow
--    The signup page creates a tenant_member row linking user to tenant.
--    The "Admins can manage" policy uses FOR ALL but only covers existing admins.
--    New signup users need to be able to insert their own membership.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'tenant_members' AND policyname = 'Users can insert own membership'
  ) THEN
    CREATE POLICY "Users can insert own membership"
      ON tenant_members FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- 2. SALES: Missing DELETE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sales' AND policyname = 'Tenant delete'
  ) THEN
    CREATE POLICY "Tenant delete" ON sales FOR DELETE
      USING (tenant_id IN (SELECT get_user_tenant_ids()));
  END IF;
END $$;

-- 3. SALE_ITEMS: Missing UPDATE and DELETE policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sale_items' AND policyname = 'Tenant update'
  ) THEN
    CREATE POLICY "Tenant update" ON sale_items FOR UPDATE
      USING (tenant_id IN (SELECT get_user_tenant_ids()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'sale_items' AND policyname = 'Tenant delete'
  ) THEN
    CREATE POLICY "Tenant delete" ON sale_items FOR DELETE
      USING (tenant_id IN (SELECT get_user_tenant_ids()));
  END IF;
END $$;

-- 4. QUEUE_ENTRIES: Missing DELETE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'queue_entries' AND policyname = 'Tenant delete'
  ) THEN
    CREATE POLICY "Tenant delete" ON queue_entries FOR DELETE
      USING (tenant_id IN (SELECT get_user_tenant_ids()));
  END IF;
END $$;

-- 5. CLIENTS: Missing DELETE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'clients' AND policyname = 'Tenant delete'
  ) THEN
    CREATE POLICY "Tenant delete" ON clients FOR DELETE
      USING (tenant_id IN (SELECT get_user_tenant_ids()));
  END IF;
END $$;

-- 6. WAIVERS: Missing UPDATE and DELETE (admin cleanup)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'waivers' AND policyname = 'Tenant update'
  ) THEN
    CREATE POLICY "Tenant update" ON waivers FOR UPDATE
      USING (tenant_id IN (SELECT get_user_tenant_ids()));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'waivers' AND policyname = 'Tenant delete'
  ) THEN
    CREATE POLICY "Tenant delete" ON waivers FOR DELETE
      USING (tenant_id IN (SELECT get_user_tenant_ids()));
  END IF;
END $$;

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================
-- 
-- SCHEMA:
--   tenants.business_type (text, nullable)
--   tenants.phone (text, nullable)  
--   tenants.website (text, nullable)
--   tenants.default_tax_rate (numeric(6,4), default 0)
--   tenants.onboarding_completed (boolean, default false)
--
-- RLS POLICIES ADDED:
--   tenant_members: "Users can insert own membership" (INSERT, user_id = auth.uid())
--   sales: "Tenant delete" (DELETE)
--   sale_items: "Tenant update" (UPDATE), "Tenant delete" (DELETE)
--   queue_entries: "Tenant delete" (DELETE)
--   clients: "Tenant delete" (DELETE)
--   waivers: "Tenant update" (UPDATE), "Tenant delete" (DELETE)
--
-- EXISTING RLS VERIFIED OK:
--   tenants: SELECT (member), UPDATE (owner), INSERT (authenticated)
--   inventory_items: SELECT, INSERT, UPDATE, DELETE (member)
--   inventory_movements: SELECT, INSERT (member)
--   tax_profiles: SELECT, INSERT, UPDATE, DELETE (member)
--   events: SELECT, INSERT, UPDATE, DELETE (member)
--   clients: SELECT, INSERT, UPDATE (member) + now DELETE
--   waivers: SELECT (member), INSERT (public) + now UPDATE, DELETE
--   sales: SELECT, INSERT, UPDATE (member) + now DELETE
--   sale_items: SELECT, INSERT (member) + now UPDATE, DELETE
--   queue_entries: SELECT (member), INSERT (public), UPDATE (member) + now DELETE
-- ============================================================================
