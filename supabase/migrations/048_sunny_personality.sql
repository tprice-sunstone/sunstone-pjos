-- ============================================================================
-- Migration 048: Sunny personality presets for customer-facing messages
-- ============================================================================
-- Allows artists to customize Sunny's tone when composing customer-facing
-- SMS messages (auto-reply, suggestions). Does NOT affect in-app mentor chat.
-- ============================================================================

-- Preset: 'warm_bubbly' (default), 'polished_professional', 'luxe_elegant', 'fun_playful', 'short_sweet'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sunny_tone_preset text DEFAULT 'warm_bubbly';

-- Optional free-text additions like "Always call clients 'babe'" or "Sign off as 'xo, Jessica'"
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS sunny_tone_custom text;
