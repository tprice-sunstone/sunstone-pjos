-- ============================================================================
-- 069: Onboarding drip email tracking columns
-- ============================================================================
-- Tracks which onboarding emails have been sent (prevents double-sends)
-- and last owner login timestamp (detects inactive users).
-- ============================================================================

-- Onboarding email sent-at timestamps
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_welcome_sent_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_inventory_nudge_sent_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_first_sale_nudge_sent_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_week1_active_sent_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_week1_inactive_sent_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_stripe_nudge_sent_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_week2_active_sent_at timestamptz;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_week2_inactive_sent_at timestamptz;

-- Last login tracking for activity detection
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_owner_login_at timestamptz;

NOTIFY pgrst, 'reload schema';
