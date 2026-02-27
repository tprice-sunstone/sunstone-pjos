-- Add theme_id column to tenants table for the theme system
-- Default is 'rose-gold' — the first-impression theme for new signups

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS theme_id TEXT DEFAULT 'rose-gold';
