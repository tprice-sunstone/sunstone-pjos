-- ============================================================================
-- 031: Call handling preferences for dedicated phone numbers
-- ============================================================================

-- Call handling preferences on tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS call_handling TEXT DEFAULT 'text_only';
-- Values: 'text_only', 'forward', 'voicemail' (future: 'ring_in_app')

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS call_forward_number TEXT;
-- Personal number to forward calls to

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS call_greeting TEXT;
-- Custom greeting text (max 200 chars)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS call_mute_during_events BOOLEAN DEFAULT true;
-- Suppress calls (override to text_only) during active events
