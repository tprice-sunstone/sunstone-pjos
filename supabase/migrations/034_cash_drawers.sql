-- ============================================================================
-- 034: Cash Drawers
-- ============================================================================
-- Complete cash drawer tracking for POS — open/close drawers, auto-log cash
-- sales, pay in/out, over/short reconciliation.
-- ============================================================================

-- ── Cash Drawer Sessions table ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_drawer_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  event_id         uuid REFERENCES events(id) ON DELETE SET NULL,
  opened_at        timestamptz NOT NULL DEFAULT now(),
  closed_at        timestamptz,
  opening_amount   numeric(10,2) NOT NULL DEFAULT 0,
  expected_amount  numeric(10,2),
  actual_amount    numeric(10,2),
  variance         numeric(10,2),
  notes            text,
  status           text NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','closed')),
  opened_by        uuid REFERENCES auth.users(id),
  closed_by        uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Cash Drawer Transactions table ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_drawer_transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES cash_drawer_sessions(id) ON DELETE CASCADE,
  tenant_id       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sale_id         uuid REFERENCES sales(id) ON DELETE SET NULL,
  type            text NOT NULL
                  CHECK (type IN ('sale','tip','pay_in','pay_out','adjustment')),
  amount          numeric(10,2) NOT NULL,
  description     text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_cash_drawer_sessions_tenant ON cash_drawer_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_sessions_event ON cash_drawer_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_sessions_status ON cash_drawer_sessions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_txns_session ON cash_drawer_transactions(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_drawer_txns_sale ON cash_drawer_transactions(sale_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE cash_drawer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_drawer_transactions ENABLE ROW LEVEL SECURITY;

-- Cash drawer sessions: tenant members can CRUD their own tenant's drawers
CREATE POLICY "tenant_cash_drawer_sessions" ON cash_drawer_sessions
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

-- Cash drawer transactions: tenant members can CRUD their own tenant's transactions
CREATE POLICY "tenant_cash_drawer_transactions" ON cash_drawer_transactions
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

-- ── Updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER set_cash_drawer_sessions_updated_at
  BEFORE UPDATE ON cash_drawer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
