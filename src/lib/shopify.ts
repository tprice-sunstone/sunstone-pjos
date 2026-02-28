// ============================================================================
// Shopify Admin API Client — src/lib/shopify.ts
// ============================================================================
// Connects to the Sunstone Shopify store (Admin API) via GraphQL.
// Powers: dashboard product cards, Sunny product knowledge, admin spotlight.
// ============================================================================

import { createServiceRoleClient } from '@/lib/supabase/server';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SunstoneProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  productType: string;
  tags: string[];
  imageUrl: string | null;
  imageAlt: string | null;
  variants: {
    title: string;
    price: string;
    sku: string;
    inventoryQuantity: number;
  }[];
  collections: string[];
  url: string;
}

export interface ShopifyDiscount {
  id: string;
  title: string;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  summary: string;
}

export interface CachedCatalog {
  products: SunstoneProduct[];
  discounts: ShopifyDiscount[];
  syncedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GraphQL Helper
// ─────────────────────────────────────────────────────────────────────────────

const SHOPIFY_API_VERSION = '2025-01';

async function shopifyAdminQuery(query: string, variables?: Record<string, any>) {
  const domain = process.env.SHOPIFY_STORE_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;

  console.log('[Shopify] ENV check — SHOPIFY_STORE_DOMAIN:', domain ? `"${domain}"` : 'MISSING');
  console.log('[Shopify] ENV check — SHOPIFY_ADMIN_TOKEN:', token ? `set (${token.length} chars, starts with "${token.slice(0, 6)}...")` : 'MISSING');

  if (!domain || !token) {
    throw new Error('Shopify environment variables not configured (SHOPIFY_STORE_DOMAIN, SHOPIFY_ADMIN_TOKEN)');
  }

  const url = `https://${domain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;
  console.log('[Shopify] Request URL:', url);
  console.log('[Shopify] Query preview:', query.slice(0, 120).replace(/\s+/g, ' ').trim() + '...');

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch (fetchErr: any) {
    console.error('[Shopify] Fetch failed (network/DNS):', fetchErr.message);
    throw new Error(`Shopify fetch failed: ${fetchErr.message}`);
  }

  console.log('[Shopify] Response status:', response.status, response.statusText);
  console.log('[Shopify] Response headers — x-request-id:', response.headers.get('x-request-id') || 'none');

  if (!response.ok) {
    let errorBody = '';
    try {
      errorBody = await response.text();
    } catch {
      errorBody = '(could not read response body)';
    }
    console.error('[Shopify] Non-OK response body:', errorBody.slice(0, 500));
    throw new Error(`Shopify API error ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const json = await response.json();

  if (json.errors) {
    console.error('[Shopify] GraphQL errors:', JSON.stringify(json.errors, null, 2));
    throw new Error(`Shopify GraphQL error: ${json.errors.map((e: any) => e.message).join('; ')}`);
  }

  console.log('[Shopify] Query succeeded, top-level keys:', Object.keys(json.data || {}));
  return json.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch All Products
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAllProducts(): Promise<SunstoneProduct[]> {
  const products: SunstoneProduct[] = [];
  let cursor: string | null = null;
  let hasNextPage = true;
  let page = 0;

  while (hasNextPage) {
    page++;
    const afterClause = cursor ? `, after: "${cursor}"` : '';
    const query = `{
      products(first: 50, query: "status:active"${afterClause}) {
        pageInfo { hasNextPage }
        edges {
          cursor
          node {
            id
            title
            description
            handle
            productType
            tags
            featuredImage {
              url
              altText
            }
            variants(first: 20) {
              edges {
                node {
                  title
                  price
                  sku
                }
              }
            }
            collections(first: 10) {
              edges {
                node {
                  title
                  handle
                }
              }
            }
          }
        }
      }
    }`;

    console.log(`[Shopify] Fetching products page ${page}${cursor ? ` (cursor: ${cursor.slice(0, 20)}...)` : ''}`);
    const data = await shopifyAdminQuery(query);
    const edges = data.products.edges;
    console.log(`[Shopify] Page ${page}: ${edges.length} products returned`);

    for (const edge of edges) {
      const node = edge.node;

      products.push({
        id: node.id,
        title: node.title,
        description: node.description || '',
        handle: node.handle,
        productType: node.productType || '',
        tags: node.tags || [],
        imageUrl: node.featuredImage?.url || null,
        imageAlt: node.featuredImage?.altText || null,
        variants: (node.variants?.edges || []).map((v: any) => ({
          title: v.node.title,
          price: v.node.price,
          sku: v.node.sku || '',
          inventoryQuantity: 0, // No longer queried — use Inventory API if needed
        })),
        collections: (node.collections?.edges || []).map((c: any) => c.node.handle),
        url: `https://permanentjewelry.sunstonewelders.com/products/${node.handle}`,
      });
    }

    hasNextPage = data.products.pageInfo.hasNextPage;
    if (edges.length > 0) {
      cursor = edges[edges.length - 1].cursor;
    } else {
      hasNextPage = false;
    }
  }

  console.log(`[Shopify] Total products fetched: ${products.length}`);
  return products;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Products by Collection
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchProductsByCollection(collectionHandle: string): Promise<SunstoneProduct[]> {
  const query = `{
    collectionByHandle(handle: "${collectionHandle}") {
      products(first: 100) {
        edges {
          node {
            id
            title
            description
            handle
            productType
            tags
            featuredImage {
              url
              altText
            }
            variants(first: 20) {
              edges {
                node {
                  title
                  price
                  sku
                }
              }
            }
            collections(first: 10) {
              edges {
                node {
                  title
                  handle
                }
              }
            }
          }
        }
      }
    }
  }`;

  const data = await shopifyAdminQuery(query);
  const edges = data.collectionByHandle?.products?.edges || [];

  return edges.map((edge: any) => {
    const node = edge.node;
    return {
      id: node.id,
      title: node.title,
      description: node.description || '',
      handle: node.handle,
      productType: node.productType || '',
      tags: node.tags || [],
      imageUrl: node.featuredImage?.url || null,
      imageAlt: node.featuredImage?.altText || null,
      variants: (node.variants?.edges || []).map((v: any) => ({
        title: v.node.title,
        price: v.node.price,
        sku: v.node.sku || '',
        inventoryQuantity: 0,
      })),
      collections: (node.collections?.edges || []).map((c: any) => c.node.handle),
      url: `https://permanentjewelry.sunstonewelders.com/products/${node.handle}`,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Active Discounts
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchActiveDiscounts(): Promise<ShopifyDiscount[]> {
  const query = `{
    automaticDiscountNodes(first: 20, query: "status:active") {
      edges {
        node {
          id
          automaticDiscount {
            ... on DiscountAutomaticBasic {
              title
              status
              startsAt
              endsAt
              summary
            }
            ... on DiscountAutomaticBxgy {
              title
              status
              startsAt
              endsAt
              summary
            }
          }
        }
      }
    }
  }`;

  try {
    const data = await shopifyAdminQuery(query);
    const edges = data.automaticDiscountNodes?.edges || [];

    return edges
      .map((edge: any) => {
        const d = edge.node.automaticDiscount;
        if (!d) return null;
        return {
          id: edge.node.id,
          title: d.title || '',
          status: d.status || '',
          startsAt: d.startsAt || null,
          endsAt: d.endsAt || null,
          summary: d.summary || '',
        };
      })
      .filter(Boolean) as ShopifyDiscount[];
  } catch {
    // Discount scopes may not be available — return empty
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Cached Catalog (reads from sunstone_catalog_cache)
// ─────────────────────────────────────────────────────────────────────────────

export async function getCachedCatalog(): Promise<CachedCatalog | null> {
  try {
    const db = await createServiceRoleClient();

    const { data: cache } = await db
      .from('sunstone_catalog_cache')
      .select('products, discounts, synced_at, expires_at')
      .limit(1)
      .single();

    if (!cache) return null;

    const isExpired = new Date(cache.expires_at) <= new Date();

    // If expired, trigger a background sync (fire-and-forget)
    if (isExpired) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL ? '' : ''}/api/shopify/sync`, {
        method: 'GET',
      }).catch(() => {});
    }

    // Return cached data even if stale — better than nothing
    return {
      products: (cache.products as SunstoneProduct[]) || [],
      discounts: (cache.discounts as ShopifyDiscount[]) || [],
      syncedAt: cache.synced_at,
    };
  } catch {
    // Table may not exist yet
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Format Catalog for AI Prompt (used by Sunny mentor)
// ─────────────────────────────────────────────────────────────────────────────

export function formatCatalogForPrompt(catalog: CachedCatalog): string {
  const { products, discounts } = catalog;
  if (products.length === 0) return '';

  // Group products by type
  const groups: Record<string, SunstoneProduct[]> = {};
  for (const p of products) {
    const type = p.productType || 'Other';
    if (!groups[type]) groups[type] = [];
    groups[type].push(p);
  }

  const lines: string[] = ['## Sunstone Product Catalog (Current)\n'];
  let tokenEstimate = 0;
  const TOKEN_LIMIT = 2000;

  for (const [type, prods] of Object.entries(groups)) {
    lines.push(`### ${type}`);
    for (const p of prods) {
      const price = p.variants[0]?.price ? `$${p.variants[0].price}` : '';
      const desc = p.description
        ? p.description.split(/[.!?]/)[0].trim().slice(0, 80)
        : '';
      const line = `- ${p.title}${price ? ` — ${price}` : ''}${desc ? ` — ${desc}` : ''}\n  URL: ${p.url}`;
      const lineTokens = Math.ceil(line.length / 4);

      if (tokenEstimate + lineTokens > TOKEN_LIMIT) {
        lines.push('  (... additional products available)');
        break;
      }

      lines.push(line);
      tokenEstimate += lineTokens;
    }
    lines.push('');

    if (tokenEstimate > TOKEN_LIMIT) break;
  }

  // Active discounts
  if (discounts.length > 0) {
    lines.push('### Current Promotions');
    for (const d of discounts) {
      const endStr = d.endsAt
        ? ` through ${new Date(d.endsAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}`
        : '';
      lines.push(`- ${d.title}${d.summary ? `: ${d.summary}` : ''}${endStr}`);
    }
    lines.push('');
  }

  lines.push('When recommending products, always include the specific product name, price, and URL so the artist can order directly.');

  return lines.join('\n');
}
