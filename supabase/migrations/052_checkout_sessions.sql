-- ============================================================================
-- 052: Checkout Sessions lookup table
-- ============================================================================
-- Maps Stripe Checkout Session IDs to tenants + connected accounts.
-- Written at session creation time so the /pay/[sessionId] redirect page
-- can look up the connected account without depending on sale/party_request
-- records (which may not exist yet or may have RLS issues).
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL,
  amount_cents INTEGER,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by session_id (the primary access pattern)
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_session_id ON checkout_sessions(session_id);

-- RLS enabled — service role bypasses for unauthenticated /pay page
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- Tenant members can read their own checkout sessions
CREATE POLICY "Tenant members can read own checkout sessions"
  ON checkout_sessions FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_members WHERE user_id = auth.uid()
  ));
