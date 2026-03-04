// ============================================================================
// Gift Card Utilities — src/lib/gift-cards.ts
// ============================================================================
// Code generation, formatting, and shared constants for gift cards.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

// Ambiguity-safe charset: no 0/O, 1/I/L
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Preset gift card dollar amounts */
export const GIFT_CARD_PRESETS = [25, 50, 75, 100, 150];

/**
 * Generate a unique 8-character gift card code for a tenant.
 * Checks for collisions against the database.
 */
export async function generateGiftCardCode(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<string> {
  const maxAttempts = 10;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
    }

    // Check for collision
    const { data } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('code', code)
      .limit(1);

    if (!data || data.length === 0) return code;
  }

  throw new Error('Failed to generate unique gift card code');
}

/** Format raw code as XXXX-XXXX */
export function formatGiftCardCode(code: string): string {
  const clean = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  if (clean.length !== 8) return clean;
  return `${clean.slice(0, 4)}-${clean.slice(4)}`;
}

/** Normalize user input: strip dashes/spaces, uppercase */
export function normalizeGiftCardCode(input: string): string {
  return input.replace(/[\s-]/g, '').toUpperCase();
}
