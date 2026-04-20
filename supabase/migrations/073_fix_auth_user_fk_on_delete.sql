-- ============================================================================
-- 073: Fix FK constraints that block auth.users deletion
-- Change all FK references to auth.users(id) to ON DELETE SET NULL
-- (except tenant_members, onboarding_checklist, push_device_tokens which
--  already have ON DELETE CASCADE and should stay that way)
-- ============================================================================

-- tenants.owner_id
ALTER TABLE tenants
  DROP CONSTRAINT IF EXISTS tenants_owner_id_fkey,
  ADD CONSTRAINT tenants_owner_id_fkey
    FOREIGN KEY (owner_id) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- inventory_movements.performed_by
ALTER TABLE inventory_movements
  DROP CONSTRAINT IF EXISTS inventory_movements_performed_by_fkey,
  ADD CONSTRAINT inventory_movements_performed_by_fkey
    FOREIGN KEY (performed_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- sales.completed_by
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_completed_by_fkey,
  ADD CONSTRAINT sales_completed_by_fkey
    FOREIGN KEY (completed_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- sales.refunded_by
ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_refunded_by_fkey,
  ADD CONSTRAINT sales_refunded_by_fkey
    FOREIGN KEY (refunded_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- client_notes.created_by
ALTER TABLE client_notes
  DROP CONSTRAINT IF EXISTS client_notes_created_by_fkey,
  ADD CONSTRAINT client_notes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- admin_notes.created_by
ALTER TABLE admin_notes
  DROP CONSTRAINT IF EXISTS admin_notes_created_by_fkey,
  ADD CONSTRAINT admin_notes_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- refunds.created_by
ALTER TABLE refunds
  DROP CONSTRAINT IF EXISTS refunds_created_by_fkey,
  ADD CONSTRAINT refunds_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- expenses.created_by
ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_created_by_fkey,
  ADD CONSTRAINT expenses_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- platform_admins.invited_by
ALTER TABLE platform_admins
  DROP CONSTRAINT IF EXISTS platform_admins_invited_by_fkey,
  ADD CONSTRAINT platform_admins_invited_by_fkey
    FOREIGN KEY (invited_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- gift_card_transactions.redeemed_by
ALTER TABLE gift_card_transactions
  DROP CONSTRAINT IF EXISTS gift_card_transactions_redeemed_by_fkey,
  ADD CONSTRAINT gift_card_transactions_redeemed_by_fkey
    FOREIGN KEY (redeemed_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- cash_drawers.opened_by
ALTER TABLE cash_drawers
  DROP CONSTRAINT IF EXISTS cash_drawers_opened_by_fkey,
  ADD CONSTRAINT cash_drawers_opened_by_fkey
    FOREIGN KEY (opened_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- cash_drawers.closed_by
ALTER TABLE cash_drawers
  DROP CONSTRAINT IF EXISTS cash_drawers_closed_by_fkey,
  ADD CONSTRAINT cash_drawers_closed_by_fkey
    FOREIGN KEY (closed_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- warranty_claims.resolved_by
ALTER TABLE warranty_claims
  DROP CONSTRAINT IF EXISTS warranty_claims_resolved_by_fkey,
  ADD CONSTRAINT warranty_claims_resolved_by_fkey
    FOREIGN KEY (resolved_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- reorder_history.ordered_by
ALTER TABLE reorder_history
  DROP CONSTRAINT IF EXISTS reorder_history_ordered_by_fkey,
  ADD CONSTRAINT reorder_history_ordered_by_fkey
    FOREIGN KEY (ordered_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- reorder_history.received_by
ALTER TABLE reorder_history
  DROP CONSTRAINT IF EXISTS reorder_history_received_by_fkey,
  ADD CONSTRAINT reorder_history_received_by_fkey
    FOREIGN KEY (received_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- catalog_hidden_products.hidden_by
ALTER TABLE catalog_hidden_products
  DROP CONSTRAINT IF EXISTS catalog_hidden_products_hidden_by_fkey,
  ADD CONSTRAINT catalog_hidden_products_hidden_by_fkey
    FOREIGN KEY (hidden_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ambassador_applications.user_id
ALTER TABLE ambassador_applications
  DROP CONSTRAINT IF EXISTS ambassador_applications_user_id_fkey,
  ADD CONSTRAINT ambassador_applications_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- ambassador_applications.approved_by
ALTER TABLE ambassador_applications
  DROP CONSTRAINT IF EXISTS ambassador_applications_approved_by_fkey,
  ADD CONSTRAINT ambassador_applications_approved_by_fkey
    FOREIGN KEY (approved_by) REFERENCES auth.users(id)
    ON DELETE SET NULL;

-- NOTE: These already have ON DELETE CASCADE and are left as-is:
--   tenant_members.user_id
--   onboarding_checklist.user_id
--   push_device_tokens.user_id

-- After running this migration, execute:
-- NOTIFY pgrst, 'reload schema';
