-- ============================================================================
-- 033: Fee Model Switch — Artist-Absorbed Platform Fee
-- ============================================================================
-- Switches the platform fee model from customer-facing to artist-absorbed.
-- The fee is now deducted from the artist's Stripe payout via
-- application_fee_amount. Customers see a clean checkout with no extra fees.
-- ============================================================================

-- Change the default for new tenants to 'absorb'
ALTER TABLE tenants ALTER COLUMN fee_handling SET DEFAULT 'absorb';

-- Switch all existing tenants to the new model
UPDATE tenants SET fee_handling = 'absorb' WHERE fee_handling = 'pass_to_customer';
