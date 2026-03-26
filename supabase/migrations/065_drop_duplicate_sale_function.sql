-- ============================================================================
-- Migration 065: Drop duplicate create_sale_transaction overload
-- ============================================================================
-- The database has two overloads of create_sale_transaction with identical
-- parameter names but different parameter ordering (different type signatures).
-- PostgreSQL cannot disambiguate when called with named parameters, causing:
--   "Could not choose the best candidate function between..."
--
-- The OLD version (pre-024) has this type signature:
--   (uuid, uuid, uuid, numeric, numeric, numeric, numeric, numeric, text,
--    jsonb, jsonb, uuid, uuid, text, text, text, text, numeric, numeric,
--    text, text, text)
--
-- The CORRECT version (from 024/060) has:
--   (uuid, uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric,
--    text, text, text, numeric, text, text, text, text, text, uuid, jsonb,
--    jsonb, uuid)
--
-- The app code uses named parameters matching the 024/060 version.
-- This migration drops the old version.
--
-- RUN THIS IN THE SUPABASE SQL EDITOR.
-- ============================================================================

-- Drop the OLD overload by its exact type signature
DROP FUNCTION IF EXISTS public.create_sale_transaction(
  uuid, uuid, uuid, numeric, numeric, numeric, numeric,
  numeric, text, jsonb, jsonb, uuid, uuid, text, text,
  text, text, numeric, numeric, text, text, text
);
