-- ============================================================================
-- Push Device Tokens — Firebase Cloud Messaging registration
-- ============================================================================
-- Stores native device tokens (APNs via FCM for iOS, FCM for Android)
-- so the server can deliver push notifications to the right devices.
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_device_tokens (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(token)
);

ALTER TABLE push_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens"
  ON push_device_tokens FOR ALL
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_push_tokens_tenant ON push_device_tokens(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_device_tokens(user_id, is_active);
