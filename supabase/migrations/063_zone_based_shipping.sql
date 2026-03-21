-- ============================================================================
-- 063: Zone-Based Shipping for All Methods
-- ============================================================================
-- Replaces flat standard rates with region-aware pricing (West/Mid/East).
-- USPS Priority updated from $9.99 to $12.95 (flat).
-- UPS Ground/2-Day/Next Day now have zone + weight class rates.
-- Argon surcharge remains $10 on UPS Ground only.
-- ============================================================================

UPDATE platform_settings
SET value = '{
  "usps_priority": 12.95,
  "ups_ground": {
    "light": { "west": 17.00, "mid": 25.00, "east": 33.00 },
    "heavy": { "west": 26.00, "mid": 43.00, "east": 68.00 }
  },
  "ups_2day": {
    "light": { "west": 28.00, "mid": 38.00, "east": 49.00 },
    "heavy": { "west": 42.00, "mid": 65.00, "east": 98.00 }
  },
  "ups_next_day": {
    "light": { "west": 45.00, "mid": 58.00, "east": 72.00 },
    "heavy": { "west": 68.00, "mid": 95.00, "east": 142.00 }
  },
  "will_call": 0,
  "argon_surcharge": 10.00
}',
    updated_at = now()
WHERE key = 'shipping_rates';

-- If the row doesn't exist yet (fresh DB), insert it
INSERT INTO platform_settings (key, value, updated_at)
SELECT 'shipping_rates', '{
  "usps_priority": 12.95,
  "ups_ground": {
    "light": { "west": 17.00, "mid": 25.00, "east": 33.00 },
    "heavy": { "west": 26.00, "mid": 43.00, "east": 68.00 }
  },
  "ups_2day": {
    "light": { "west": 28.00, "mid": 38.00, "east": 49.00 },
    "heavy": { "west": 42.00, "mid": 65.00, "east": 98.00 }
  },
  "ups_next_day": {
    "light": { "west": 45.00, "mid": 58.00, "east": 72.00 },
    "heavy": { "west": 68.00, "mid": 95.00, "east": 142.00 }
  },
  "will_call": 0,
  "argon_surcharge": 10.00
}', now()
WHERE NOT EXISTS (SELECT 1 FROM platform_settings WHERE key = 'shipping_rates');
