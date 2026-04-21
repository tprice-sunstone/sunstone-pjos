-- ============================================================================
-- 073: Fix FK constraints that block auth.users deletion
-- Change all FK references to auth.users(id) to ON DELETE SET NULL
-- (except tenant_members, onboarding_checklist, push_device_tokens which
--  already have ON DELETE CASCADE and should stay that way)
--
-- Each block is wrapped in a conditional check so the migration won't fail
-- if a table or column doesn't exist in the live database.
-- ============================================================================

-- tenants.owner_id
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenants' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE tenants
      DROP CONSTRAINT IF EXISTS tenants_owner_id_fkey,
      ADD CONSTRAINT tenants_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- inventory_movements.performed_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'inventory_movements' AND column_name = 'performed_by'
  ) THEN
    ALTER TABLE inventory_movements
      DROP CONSTRAINT IF EXISTS inventory_movements_performed_by_fkey,
      ADD CONSTRAINT inventory_movements_performed_by_fkey
        FOREIGN KEY (performed_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- sales.completed_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'completed_by'
  ) THEN
    ALTER TABLE sales
      DROP CONSTRAINT IF EXISTS sales_completed_by_fkey,
      ADD CONSTRAINT sales_completed_by_fkey
        FOREIGN KEY (completed_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- sales.refunded_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'refunded_by'
  ) THEN
    ALTER TABLE sales
      DROP CONSTRAINT IF EXISTS sales_refunded_by_fkey,
      ADD CONSTRAINT sales_refunded_by_fkey
        FOREIGN KEY (refunded_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- client_notes.created_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'client_notes' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE client_notes
      DROP CONSTRAINT IF EXISTS client_notes_created_by_fkey,
      ADD CONSTRAINT client_notes_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- admin_notes.created_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'admin_notes' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE admin_notes
      DROP CONSTRAINT IF EXISTS admin_notes_created_by_fkey,
      ADD CONSTRAINT admin_notes_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- refunds.created_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'refunds' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE refunds
      DROP CONSTRAINT IF EXISTS refunds_created_by_fkey,
      ADD CONSTRAINT refunds_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- expenses.created_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'expenses' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE expenses
      DROP CONSTRAINT IF EXISTS expenses_created_by_fkey,
      ADD CONSTRAINT expenses_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- platform_admins.invited_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'platform_admins' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE platform_admins
      DROP CONSTRAINT IF EXISTS platform_admins_invited_by_fkey,
      ADD CONSTRAINT platform_admins_invited_by_fkey
        FOREIGN KEY (invited_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- gift_card_redemptions.redeemed_by (was incorrectly "gift_card_transactions")
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'gift_card_redemptions' AND column_name = 'redeemed_by'
  ) THEN
    ALTER TABLE gift_card_redemptions
      DROP CONSTRAINT IF EXISTS gift_card_redemptions_redeemed_by_fkey,
      ADD CONSTRAINT gift_card_redemptions_redeemed_by_fkey
        FOREIGN KEY (redeemed_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- cash_drawer_sessions.opened_by (was incorrectly "cash_drawers")
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_drawer_sessions' AND column_name = 'opened_by'
  ) THEN
    ALTER TABLE cash_drawer_sessions
      DROP CONSTRAINT IF EXISTS cash_drawer_sessions_opened_by_fkey,
      ADD CONSTRAINT cash_drawer_sessions_opened_by_fkey
        FOREIGN KEY (opened_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- cash_drawer_sessions.closed_by (was incorrectly "cash_drawers")
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cash_drawer_sessions' AND column_name = 'closed_by'
  ) THEN
    ALTER TABLE cash_drawer_sessions
      DROP CONSTRAINT IF EXISTS cash_drawer_sessions_closed_by_fkey,
      ADD CONSTRAINT cash_drawer_sessions_closed_by_fkey
        FOREIGN KEY (closed_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- warranty_claims.resolved_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'warranty_claims' AND column_name = 'resolved_by'
  ) THEN
    ALTER TABLE warranty_claims
      DROP CONSTRAINT IF EXISTS warranty_claims_resolved_by_fkey,
      ADD CONSTRAINT warranty_claims_resolved_by_fkey
        FOREIGN KEY (resolved_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- reorder_history.ordered_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reorder_history' AND column_name = 'ordered_by'
  ) THEN
    ALTER TABLE reorder_history
      DROP CONSTRAINT IF EXISTS reorder_history_ordered_by_fkey,
      ADD CONSTRAINT reorder_history_ordered_by_fkey
        FOREIGN KEY (ordered_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- reorder_history.received_by
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reorder_history' AND column_name = 'received_by'
  ) THEN
    ALTER TABLE reorder_history
      DROP CONSTRAINT IF EXISTS reorder_history_received_by_fkey,
      ADD CONSTRAINT reorder_history_received_by_fkey
        FOREIGN KEY (received_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- catalog_product_visibility.hidden_by (was incorrectly "catalog_hidden_products")
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'catalog_product_visibility' AND column_name = 'hidden_by'
  ) THEN
    ALTER TABLE catalog_product_visibility
      DROP CONSTRAINT IF EXISTS catalog_product_visibility_hidden_by_fkey,
      ADD CONSTRAINT catalog_product_visibility_hidden_by_fkey
        FOREIGN KEY (hidden_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- ambassadors.user_id (was incorrectly "ambassador_applications")
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ambassadors' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE ambassadors
      DROP CONSTRAINT IF EXISTS ambassadors_user_id_fkey,
      ADD CONSTRAINT ambassadors_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- ambassadors.approved_by (was incorrectly "ambassador_applications")
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ambassadors' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE ambassadors
      DROP CONSTRAINT IF EXISTS ambassadors_approved_by_fkey,
      ADD CONSTRAINT ambassadors_approved_by_fkey
        FOREIGN KEY (approved_by) REFERENCES auth.users(id)
        ON DELETE SET NULL;
  END IF;
END $$;

-- NOTE: These already have ON DELETE CASCADE and are left as-is:
--   tenant_members.user_id
--   onboarding_checklist.user_id
--   push_device_tokens.user_id

-- After running this migration, execute:
-- NOTIFY pgrst, 'reload schema';
