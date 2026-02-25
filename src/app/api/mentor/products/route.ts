// src/app/api/mentor/products/route.ts
// POST endpoint to search Sunstone's Shopify Storefront catalog
// Used by the Sunny chat to display product cards inline

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

const SHOPIFY_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
const STOREFRONT_TOKEN = process.env.SHOPIFY_STOREFRONT_TOKEN;

const GRAPHQL_QUERY = `
  query searchProducts($query: String!, $first: Int!) {
    products(first: $first, query: $query) {
      edges {
        node {
          id
          title
          description
          handle
          productType
          tags
          priceRange {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          images(first: 1) {
            edges {
              node { url altText }
            }
          }
          variants(first: 5) {
            edges {
              node {
                id
                title
                price { amount currencyCode }
                availableForSale
              }
            }
          }
        }
      }
    }
  }
`;

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createServerSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { query } = await request.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query required' }, { status: 400 });
    }

    // Check if Shopify is configured
    if (!SHOPIFY_DOMAIN || !STOREFRONT_TOKEN) {
      return NextResponse.json({
        products: [],
        fallback: true,
        message: 'Visit sunstonesupply.com for our full catalog',
      });
    }

    // Search Shopify Storefront API
    const response = await fetch(`https://${SHOPIFY_DOMAIN}/api/2024-01/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': STOREFRONT_TOKEN,
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: { query: query.trim(), first: 6 },
      }),
    });

    if (!response.ok) {
      console.error('[Mentor Products] Shopify API error:', response.status);
      return NextResponse.json({
        products: [],
        fallback: true,
        message: 'Visit sunstonesupply.com for our full catalog',
      });
    }

    const data = await response.json();
    const edges = data?.data?.products?.edges || [];

    const products = edges.map((edge: any) => {
      const node = edge.node;
      const image = node.images?.edges?.[0]?.node;
      const minPrice = node.priceRange?.minVariantPrice;
      const maxPrice = node.priceRange?.maxVariantPrice;

      const priceDisplay = minPrice?.amount === maxPrice?.amount
        ? `$${parseFloat(minPrice?.amount || '0').toFixed(2)}`
        : `$${parseFloat(minPrice?.amount || '0').toFixed(2)} – $${parseFloat(maxPrice?.amount || '0').toFixed(2)}`;

      return {
        id: node.id,
        title: node.title,
        handle: node.handle,
        description: node.description?.slice(0, 120) || '',
        price: priceDisplay,
        imageUrl: image?.url || null,
        imageAlt: image?.altText || node.title,
        url: `https://sunstonesupply.com/products/${node.handle}`,
        available: node.variants?.edges?.some((v: any) => v.node.availableForSale) ?? true,
      };
    });

    return NextResponse.json({ products, fallback: false });
  } catch (error) {
    console.error('[Mentor Products] Error:', error);
    return NextResponse.json({
      products: [],
      fallback: true,
      message: 'Visit sunstonesupply.com for our full catalog',
    });
  }
}