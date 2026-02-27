-- ============================================================================
-- Migration 010: Platform Config + Sunstone Product Catalog
-- ============================================================================
-- Adds platform_config (key-value store for platform-wide settings)
-- and sunstone_product_catalog (featured products for dashboard spotlight).
-- ============================================================================

-- Platform-wide configuration (key-value with JSONB)
CREATE TABLE IF NOT EXISTS platform_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sunstone product catalog for dashboard spotlight rotation
CREATE TABLE IF NOT EXISTS sunstone_product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subtitle TEXT,
  cta_label TEXT NOT NULL DEFAULT 'Order from Sunstone',
  cta_url TEXT NOT NULL,
  image_url TEXT,
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed: initial product catalog
INSERT INTO sunstone_product_catalog (name, subtitle, cta_url, sort_order) VALUES
  ('Rose Gold Satellite Chain', 'Our most popular chain — a best seller at every event', 'https://sunstonesupply.com/collections/chain', 1),
  ('Sterling Silver Cable Chain', 'A timeless classic your clients will love', 'https://sunstonesupply.com/collections/chain', 2),
  ('Gold Filled Figaro Chain', 'Bold and beautiful — perfect for statement pieces', 'https://sunstonesupply.com/collections/chain', 3),
  ('Rose Gold Paperclip Chain', 'Trendy and lightweight — flying off the display', 'https://sunstonesupply.com/collections/chain', 4)
ON CONFLICT DO NOTHING;

-- Seed: spotlight config (rotation mode by default)
INSERT INTO platform_config (key, value) VALUES (
  'sunstone_spotlight',
  '{"mode": "rotate", "rotation_index": 0}'
) ON CONFLICT (key) DO NOTHING;
