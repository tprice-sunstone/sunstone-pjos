// ============================================================================
// ChainProductPicker — POS Product Selection for Chains
// ============================================================================
// New file: src/components/ChainProductPicker.tsx
//
// Opens as a modal/bottom-sheet when an artist taps a chain in the POS.
// Shows available products with prices. Handles:
//   - Per-product mode: tap product → add to cart immediately
//   - Per-inch mode: tap product → measurement step → add to cart
//   - Custom product: enter name + price/inches → add to cart
//   - Event filtering: only show product types allowed for the current event
//
// IMPORTANT: No inches shown in the product list. Inches only appear in the
// measurement step (per-inch mode) and custom product form.
// ============================================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import type {
  InventoryItem,
  ProductType,
  ChainProductPrice,
  PricingMode,
} from '@/types';

// Product type display — no emojis

// ============================================================================
// Types
// ============================================================================

interface ChainProductPickerProps {
  /** The chain inventory item that was tapped */
  chain: InventoryItem;
  /** Current tenant ID */
  tenantId: string;
  /** Event ID for filtering (null = store mode, show all) */
  eventId: string | null;
  /** Called when a product is selected and should be added to cart */
  onAddToCart: (item: {
    inventory_item_id: string;
    name: string;
    quantity: number;
    unit_price: number;
    discount_type: null;
    discount_value: number;
    product_type_id: string | null;
    product_type_name: string | null;
    inches_used: number | null;
    pricing_mode: PricingMode;
  }) => void;
  /** Called when the picker should close */
  onClose: () => void;
}

// ============================================================================
// Product list item for per-product mode
// ============================================================================

interface ProductOption {
  productType: ProductType;
  sellPrice: number;
  inchesUsed: number;
  isEstimate: boolean; // true for per-inch mode
}

// ============================================================================
// Component
// ============================================================================

export default function ChainProductPicker({
  chain,
  tenantId,
  eventId,
  onAddToCart,
  onClose,
}: ChainProductPickerProps) {
  const supabase = createClient();

  // Data
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [chainPrices, setChainPrices] = useState<ChainProductPrice[]>([]);
  const [eventProductTypeIds, setEventProductTypeIds] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [view, setView] = useState<'list' | 'measure' | 'custom'>('list');
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);

  // Measurement step (per-inch mode)
  const [measureInches, setMeasureInches] = useState('');

  // Custom product
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customInches, setCustomInches] = useState('');

  const isPerInch = chain.pricing_mode === 'per_inch';
  const perInchRate = isPerInch ? Number(chain.sell_price) : 0;

  // ── Load data ──────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      // Fetch all active product types for this tenant
      const { data: types } = await supabase
        .from('product_types')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('sort_order');

      setProductTypes((types || []) as ProductType[]);

      // Fetch chain_product_prices for this chain (per-product mode)
      if (!isPerInch) {
        const { data: prices } = await supabase
          .from('chain_product_prices')
          .select('*')
          .eq('inventory_item_id', chain.id)
          .eq('is_active', true);

        setChainPrices((prices || []) as ChainProductPrice[]);
      }

      // Fetch event product type filter (if in event mode)
      if (eventId) {
        const { data: eventPT } = await supabase
          .from('event_product_types')
          .select('product_type_id')
          .eq('event_id', eventId);

        if (eventPT && eventPT.length > 0) {
          setEventProductTypeIds(eventPT.map((e: any) => e.product_type_id));
        } else {
          setEventProductTypeIds(null); // null = show all
        }
      }

      setLoading(false);
    };

    load();
  }, [chain.id, tenantId, eventId, isPerInch]);

  // ── Build product options ──────────────────────────────────────────────

  const productOptions: ProductOption[] = useMemo(() => {
    if (isPerInch) {
      // Per-inch mode: show all active product types with estimated prices
      return productTypes
        .filter((pt) => !eventProductTypeIds || eventProductTypeIds.includes(pt.id))
        .map((pt) => ({
          productType: pt,
          sellPrice: Math.round(Number(pt.default_inches) * perInchRate * 100) / 100,
          inchesUsed: Number(pt.default_inches),
          isEstimate: true,
        }));
    } else {
      // Per-product mode: show only products with configured prices
      return chainPrices
        .filter((cp) => {
          const pt = productTypes.find((t) => t.id === cp.product_type_id);
          if (!pt) return false;
          if (eventProductTypeIds && !eventProductTypeIds.includes(pt.id)) return false;
          return true;
        })
        .map((cp) => {
          const pt = productTypes.find((t) => t.id === cp.product_type_id)!;
          return {
            productType: pt,
            sellPrice: Number(cp.sell_price),
            inchesUsed: cp.default_inches ? Number(cp.default_inches) : Number(pt.default_inches),
            isEstimate: false,
          };
        })
        .sort((a, b) => a.productType.sort_order - b.productType.sort_order);
    }
  }, [productTypes, chainPrices, eventProductTypeIds, isPerInch, perInchRate]);

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleProductTap = (option: ProductOption) => {
    if (isPerInch) {
      // Per-inch mode: open measurement step
      setSelectedProduct(option);
      setMeasureInches(option.inchesUsed.toFixed(2));
      setView('measure');
    } else {
      // Per-product mode: add to cart immediately
      onAddToCart({
        inventory_item_id: chain.id,
        name: `${chain.name} ${option.productType.name}`,
        quantity: 1,
        unit_price: option.sellPrice,
        discount_type: null,
        discount_value: 0,
        product_type_id: option.productType.id,
        product_type_name: option.productType.name,
        inches_used: option.inchesUsed,
        pricing_mode: 'per_product',
      });
      onClose();
    }
  };

  const handleMeasureConfirm = () => {
    if (!selectedProduct) return;
    const inches = Number(measureInches);
    if (!inches || inches <= 0) return;

    const price = Math.round(inches * perInchRate * 100) / 100;

    onAddToCart({
      inventory_item_id: chain.id,
      name: `${chain.name} ${selectedProduct.productType.name}`,
      quantity: 1,
      unit_price: price,
      discount_type: null,
      discount_value: 0,
      product_type_id: selectedProduct.productType.id,
      product_type_name: selectedProduct.productType.name,
      inches_used: inches,
      pricing_mode: 'per_inch',
    });
    onClose();
  };

  const handleCustomConfirm = () => {
    const inches = Number(customInches);
    if (!customName || !inches || inches <= 0) return;

    let price: number;
    if (isPerInch) {
      price = Math.round(inches * perInchRate * 100) / 100;
    } else {
      price = Number(customPrice);
      if (!price || price <= 0) return;
    }

    onAddToCart({
      inventory_item_id: chain.id,
      name: `${chain.name} ${customName}`,
      quantity: 1,
      unit_price: price,
      discount_type: null,
      discount_value: 0,
      product_type_id: null,
      product_type_name: 'Custom',
      inches_used: inches,
      pricing_mode: chain.pricing_mode ?? 'per_product',
    });
    onClose();
  };

  // ── Computed values for measurement step ───────────────────────────────

  const measurePrice = useMemo(() => {
    const inches = Number(measureInches);
    if (!inches || inches <= 0) return 0;
    return Math.round(inches * perInchRate * 100) / 100;
  }, [measureInches, perInchRate]);

  const customCalcPrice = useMemo(() => {
    if (!isPerInch) return null;
    const inches = Number(customInches);
    if (!inches || inches <= 0) return 0;
    return Math.round(inches * perInchRate * 100) / 100;
  }, [customInches, perInchRate, isPerInch]);

  // ── No products configured ─────────────────────────────────────────────

  const hasNoProducts = !loading && productOptions.length === 0 && !isPerInch;

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full md:max-w-md md:mx-4 bg-[var(--surface-base)] rounded-t-2xl md:rounded-2xl shadow-2xl max-h-[85vh] flex flex-col overflow-hidden">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="px-5 pt-5 pb-3 border-b border-[var(--border-subtle)]">
          {/* Drag handle (mobile) */}
          <div className="w-8 h-1 bg-[var(--border-default)] rounded-full mx-auto mb-3 md:hidden" />

          <div className="flex items-center justify-between">
            <div>
              {view === 'list' && (
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {chain.name}
                </h2>
              )}
              {view === 'measure' && selectedProduct && (
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {chain.name} · {selectedProduct.productType.name}
                </h2>
              )}
              {view === 'custom' && (
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {chain.name} · Custom
                </h2>
              )}
              {view === 'list' && (
                <p className="text-sm text-[var(--text-tertiary)] mt-0.5">
                  Select a product
                </p>
              )}
            </div>
            <button
              onClick={view === 'list' ? onClose : () => setView('list')}
              className="p-2 -mr-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {view === 'list' ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {/* No Products Configured (per-product mode only) */}
          {hasNoProducts && (
            <div className="p-6 text-center">
              <div className="text-4xl mb-3">⚠️</div>
              <p className="text-[var(--text-primary)] font-medium mb-1">
                No products configured
              </p>
              <p className="text-sm text-[var(--text-tertiary)] mb-4">
                Set up pricing for this chain in Inventory to start selling.
              </p>
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          )}

          {/* ── Product List View ───────────────────────────── */}
          {!loading && view === 'list' && !hasNoProducts && (
            <div className="p-2">
              {/* Product options */}
              {productOptions.map((option) => (
                <button
                  key={option.productType.id}
                  onClick={() => handleProductTap(option)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-[var(--surface-raised)] active:bg-[var(--surface-sunken)] transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--text-primary)] font-medium">
                      {option.productType.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-primary)]  font-medium">
                      {option.isEstimate ? '~' : ''}${option.sellPrice.toFixed(2)}
                    </span>
                    <svg
                      className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </button>
              ))}

              {/* Divider */}
              <div className="mx-4 my-1 border-t border-[var(--border-subtle)]" />

              {/* Custom option */}
              <button
                onClick={() => setView('custom')}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl hover:bg-[var(--surface-raised)] active:bg-[var(--surface-sunken)] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">✏️</span>
                  <span className="text-[var(--text-secondary)] font-medium">
                    Custom
                  </span>
                </div>
                <svg
                  className="w-4 h-4 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)] transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>

              {/* Per-inch footer note */}
              {isPerInch && productOptions.length > 0 && (
                <p className="text-xs text-[var(--text-tertiary)] text-center px-4 py-3">
                  Prices shown are estimates based on standard sizing.
                  Exact price calculated after measurement.
                </p>
              )}
            </div>
          )}

          {/* ── Measurement Step (Per-Inch Mode) ────────────── */}
          {view === 'measure' && selectedProduct && (
            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Inches
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  value={measureInches}
                  onChange={(e) => setMeasureInches(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-lg  focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between py-3 px-4 bg-[var(--surface-raised)] rounded-xl">
                <span className="text-sm text-[var(--text-secondary)]">Price</span>
                <span className="text-2xl font-bold  text-[var(--accent-primary)]">
                  ${measurePrice.toFixed(2)}
                </span>
              </div>

              <p className="text-xs text-[var(--text-tertiary)] text-center">
                ${perInchRate.toFixed(2)}/in × {measureInches || '0'} in
              </p>

              <Button
                variant="primary"
                size="lg"
                className="w-full text-lg"
                onClick={handleMeasureConfirm}
                disabled={!Number(measureInches) || Number(measureInches) <= 0}
              >
                Add to Cart — ${measurePrice.toFixed(2)}
              </Button>
            </div>
          )}

          {/* ── Custom Product Form ─────────────────────────── */}
          {view === 'custom' && (
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Product Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Belly Chain"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
                  autoFocus
                />
              </div>

              {/* Per-product mode: manual price entry */}
              {!isPerInch && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                    Sell Price
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] ">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full h-11 pl-8 pr-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm  focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Inches Used
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.25"
                  placeholder="0.00"
                  value={customInches}
                  onChange={(e) => setCustomInches(e.target.value)}
                  className="w-full h-11 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm  focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)]"
                />
                <p className="text-xs text-[var(--text-tertiary)] mt-1">
                  For inventory tracking only — not shown to customer
                </p>
              </div>

              {/* Per-inch mode: show auto-calculated price */}
              {isPerInch && customCalcPrice !== null && (
                <div className="flex items-center justify-between py-3 px-4 bg-[var(--surface-raised)] rounded-xl">
                  <span className="text-sm text-[var(--text-secondary)]">Price</span>
                  <span className="text-xl font-bold  text-[var(--accent-primary)]">
                    ${(customCalcPrice || 0).toFixed(2)}
                  </span>
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full text-lg mt-2"
                onClick={handleCustomConfirm}
                disabled={
                  !customName ||
                  !Number(customInches) ||
                  Number(customInches) <= 0 ||
                  (!isPerInch && (!Number(customPrice) || Number(customPrice) <= 0))
                }
              >
                Add to Cart
                {isPerInch && customCalcPrice
                  ? ` — $${customCalcPrice.toFixed(2)}`
                  : !isPerInch && Number(customPrice) > 0
                    ? ` — $${Number(customPrice).toFixed(2)}`
                    : ''}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}