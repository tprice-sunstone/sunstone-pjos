// ============================================================================
// Shopify Catalog Sync — src/app/api/shopify/sync/route.ts
// ============================================================================
// GET: Syncs the Shopify catalog to the local cache table.
// - Checks if cache is fresh (< 24h) and skips unless ?force=true
// - Callable manually or on a schedule
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { fetchAllProducts, fetchActiveDiscounts } from '@/lib/shopify';
import type { SunstoneProduct, ShopifyDiscount } from '@/lib/shopify';

export async function GET(request: NextRequest) {
  try {
    // Check env vars
    if (!process.env.SHOPIFY_STORE_DOMAIN || !process.env.SHOPIFY_ADMIN_TOKEN) {
      return NextResponse.json(
        { error: 'Shopify environment variables not configured. Set SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_TOKEN.' },
        { status: 500 }
      );
    }

    const force = request.nextUrl.searchParams.get('force') === 'true';
    const db = await createServiceRoleClient();

    // Check if cache is still fresh (skip sync if not forced)
    if (!force) {
      try {
        const { data: cache } = await db
          .from('sunstone_catalog_cache')
          .select('expires_at')
          .limit(1)
          .single();

        if (cache && new Date(cache.expires_at) > new Date()) {
          return NextResponse.json({
            status: 'fresh',
            message: 'Cache is still valid. Use ?force=true to refresh.',
            expiresAt: cache.expires_at,
          });
        }
      } catch {
        // Table may not exist — continue with sync
      }
    }

    // Fetch from Shopify
    let products: SunstoneProduct[] = [];
    let discounts: ShopifyDiscount[] = [];

    try {
      products = await fetchAllProducts();
    } catch (err: any) {
      console.error('[Shopify Sync] Failed to fetch products:', err.message);
      return NextResponse.json(
        { error: 'Failed to fetch products from Shopify', detail: err.message },
        { status: 502 }
      );
    }

    try {
      discounts = await fetchActiveDiscounts();
    } catch (err: any) {
      console.warn('[Shopify Sync] Failed to fetch discounts (non-critical):', err.message);
      // Continue — discounts are not required
    }

    // Upsert into cache
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    try {
      // Use the singleton pattern: delete + insert (upsert on generated UUID is tricky)
      await db.from('sunstone_catalog_cache').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await db.from('sunstone_catalog_cache').insert({
        products,
        discounts,
        synced_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });
    } catch (err: any) {
      console.error('[Shopify Sync] Failed to write cache:', err.message);
      return NextResponse.json(
        { error: 'Failed to write cache', detail: err.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: 'synced',
      productCount: products.length,
      discountCount: discounts.length,
      syncedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error('[Shopify Sync] Unexpected error:', err);
    return NextResponse.json(
      { error: 'Unexpected error', detail: err.message },
      { status: 500 }
    );
  }
}
