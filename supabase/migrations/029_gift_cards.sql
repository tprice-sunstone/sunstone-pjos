-- ============================================================================
-- 029: Gift Cards
-- ============================================================================
-- Digital gift card system for permanent jewelry businesses.
-- Supports purchase, delivery (SMS/email), and redemption at POS.
-- ============================================================================

-- ── Gift Cards table ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_cards (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code          text NOT NULL,                  -- 8 chars, displayed as XXXX-XXXX
  amount        numeric(10,2) NOT NULL CHECK (amount > 0),
  remaining_balance numeric(10,2) NOT NULL CHECK (remaining_balance >= 0),
  status        text NOT NULL DEFAULT 'active'
                CHECK (status IN ('active','fully_redeemed','expired','cancelled')),

  -- Purchaser info
  purchaser_name  text,
  purchaser_email text,
  purchaser_phone text,

  -- Recipient info
  recipient_name  text NOT NULL,
  recipient_email text,
  recipient_phone text,
  personal_message text,

  -- Delivery
  delivery_method text NOT NULL DEFAULT 'none'
                  CHECK (delivery_method IN ('sms','email','print','none')),
  delivered_at    timestamptz,

  -- Payment
  payment_method  text,           -- how the purchaser paid
  sale_id         uuid REFERENCES sales(id),  -- the sale record for the purchase

  -- Lifecycle
  purchased_at    timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz,
  cancelled_at    timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (tenant_id, code)
);

-- ── Gift Card Redemptions table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS gift_card_redemptions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id  uuid NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
  sale_id       uuid NOT NULL REFERENCES sales(id),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount        numeric(10,2) NOT NULL CHECK (amount > 0),
  redeemed_at   timestamptz NOT NULL DEFAULT now(),
  redeemed_by   uuid REFERENCES auth.users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ── Add gift card columns to sales ────────────────────────────────────────

ALTER TABLE sales ADD COLUMN IF NOT EXISTS gift_card_id uuid REFERENCES gift_cards(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS gift_card_amount_applied numeric(10,2) DEFAULT 0;

-- ── Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_gift_cards_tenant ON gift_cards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_code ON gift_cards(tenant_id, code);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_card ON gift_card_redemptions(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_redemptions_sale ON gift_card_redemptions(sale_id);

-- ── Row Level Security ────────────────────────────────────────────────────

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_card_redemptions ENABLE ROW LEVEL SECURITY;

-- Gift cards: tenant members can CRUD their own tenant's cards
CREATE POLICY "tenant_gift_cards" ON gift_cards
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- Gift card redemptions: tenant members can CRUD their own tenant's redemptions
CREATE POLICY "tenant_gift_card_redemptions" ON gift_card_redemptions
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
    )
  );

-- ── Updated_at trigger ────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER set_gift_cards_updated_at
  BEFORE UPDATE ON gift_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
