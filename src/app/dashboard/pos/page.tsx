// ============================================================================
// Store Mode POS — src/app/dashboard/pos/page.tsx
// ============================================================================
// Luxury step-down product selection with visual hierarchy.
// Includes: QR code for waiver check-in, MiniQueueStrip, serving banner,
// queue-to-POS client linking, cancel serving, walk-up sales.
// ============================================================================

'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useCartStore } from '@/hooks/use-cart';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PLATFORM_FEE_RATES } from '@/types';
import { generateQRData } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { QRCode, FullScreenQR } from '@/components/QRCode';
import CartPanel from '@/components/CartPanel';
import MiniQueueStrip from '@/components/MiniQueueStrip';
import type {
  InventoryItem,
  TaxProfile,
  PaymentMethod,
  ProductType,
  ChainProductPrice,
} from '@/types';

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'card_present', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'other', label: 'Other' },
];

const TIP_PRESETS = [0, 3, 5, 10, 15, 20];

type CheckoutStep = 'items' | 'tip' | 'payment' | 'confirmation';
type SelectionStep = 'category' | 'material' | 'chain' | 'measure';

const NON_CHAIN_LABELS: Record<string, string> = {
  jump_ring: 'Jump Rings',
  charm: 'Charms',
  connector: 'Connectors',
  other: 'Other Items',
};

// SVG icons as components
const BackArrow = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);
const ChevronRight = () => (
  <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default function StoreModePage() {
  const { tenant } = useTenant();
  const router = useRouter();

  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [chainPrices, setChainPrices] = useState<ChainProductPrice[]>([]);
  const [step, setStep] = useState<CheckoutStep>('items');
  const [receiptEmail, setReceiptEmail] = useState('');
  const [receiptPhone, setReceiptPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [todaySales, setTodaySales] = useState({ count: 0, total: 0 });
  const [showCart, setShowCart] = useState(false);

  // Step-down selection
  const [selectionStep, setSelectionStep] = useState<SelectionStep>('category');
  const [selectedProductType, setSelectedProductType] = useState<ProductType | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [selectedChain, setSelectedChain] = useState<InventoryItem | null>(null);
  const [measureInches, setMeasureInches] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customItem, setCustomItem] = useState({ name: '', price: '' });
  const [selectedNonChainType, setSelectedNonChainType] = useState<string | null>(null);

  // QR code state
  const [showQR, setShowQR] = useState(false);
  const [showFullScreenQR, setShowFullScreenQR] = useState(false);

  // Queue/check-in state
  const [activeQueueEntry, setActiveQueueEntry] = useState<any | null>(null);

  const cart = useCartStore();
  const supabase = createClient();

  // ── Load data ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!tenant) return;
    const load = async () => {
      const { data: taxProfiles } = await supabase
        .from('tax_profiles').select('*').eq('tenant_id', tenant.id).eq('is_default', true).limit(1);
      if (taxProfiles?.[0]) {
        setTaxProfile(taxProfiles[0] as TaxProfile);
        cart.setTaxRate(Number(taxProfiles[0].rate));
      } else {
        const { data: anyTax } = await supabase
          .from('tax_profiles').select('*').eq('tenant_id', tenant.id).limit(1);
        if (anyTax?.[0]) { setTaxProfile(anyTax[0] as TaxProfile); cart.setTaxRate(Number(anyTax[0].rate)); }
      }

      const { data: items } = await supabase
        .from('inventory_items').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('type').order('name');
      setInventory((items || []) as InventoryItem[]);

      const { data: pts } = await supabase
        .from('product_types').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('sort_order');
      setProductTypes((pts || []) as ProductType[]);

      const { data: prices } = await supabase
        .from('chain_product_prices').select('*').eq('tenant_id', tenant.id).eq('is_active', true);
      setChainPrices((prices || []) as ChainProductPrice[]);

      cart.setPlatformFeeRate(PLATFORM_FEE_RATES[tenant.subscription_tier]);
      cart.setFeeHandling(tenant.fee_handling);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data: sales } = await supabase
        .from('sales').select('total').eq('tenant_id', tenant.id).is('event_id', null).eq('status', 'completed').gte('created_at', today.toISOString());
      if (sales) setTodaySales({ count: sales.length, total: sales.reduce((s, r) => s + Number(r.total), 0) });
    };
    load();
  }, [tenant]);

  // ── Derived data ───────────────────────────────────────────────────────

  const chains = useMemo(() => inventory.filter((i) => i.type === 'chain'), [inventory]);

  const nonChainTypes = useMemo(() => {
    const types = new Set<string>();
    inventory.forEach((i) => { if (i.type !== 'chain') types.add(i.type); });
    return Array.from(types);
  }, [inventory]);

  const primaryTypes = useMemo(() => productTypes.slice(0, 2), [productTypes]);
  const secondaryTypes = useMemo(() => productTypes.slice(2), [productTypes]);

  const chainsForProductType = useMemo(() => {
    if (!selectedProductType) return [];
    const ids = new Set(chainPrices.filter((p) => p.product_type_id === selectedProductType.id).map((p) => p.inventory_item_id));
    return chains.filter((c) => ids.has(c.id) && c.quantity_on_hand > 0);
  }, [selectedProductType, chainPrices, chains]);

  const materialsForProductType = useMemo(() => {
    const mats = new Map<string, number>();
    chainsForProductType.forEach((c) => { const m = c.material || 'Unspecified'; mats.set(m, (mats.get(m) || 0) + 1); });
    return Array.from(mats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [chainsForProductType]);

  const chainsForMaterial = useMemo(() => {
    if (!selectedMaterial) return [];
    return chainsForProductType.filter((c) => (c.material || 'Unspecified') === selectedMaterial);
  }, [selectedMaterial, chainsForProductType]);

  const nonChainItems = useMemo(() => {
    if (!selectedNonChainType) return [];
    return inventory.filter((i) => i.type === selectedNonChainType && i.quantity_on_hand > 0);
  }, [selectedNonChainType, inventory]);

  // ── Helpers ────────────────────────────────────────────────────────────

  const chainAvailCount = (ptId: string) =>
    chains.filter((c) => c.quantity_on_hand > 0 && chainPrices.some((p) => p.inventory_item_id === c.id && p.product_type_id === ptId)).length;

  const getChainPrice = (chain: InventoryItem): string => {
    if (!selectedProductType) return `$${Number(chain.sell_price).toFixed(2)}`;
    if (chain.pricing_mode === 'per_inch') return `$${Number(chain.sell_price).toFixed(2)}/in`;
    const row = chainPrices.find((p) => p.inventory_item_id === chain.id && p.product_type_id === selectedProductType.id);
    return row ? `$${Number(row.sell_price).toFixed(2)}` : `$${Number(chain.sell_price).toFixed(2)}`;
  };

  // ── Navigation ─────────────────────────────────────────────────────────

  const goHome = () => {
    setSelectionStep('category'); setSelectedProductType(null); setSelectedMaterial(null);
    setSelectedChain(null); setSelectedNonChainType(null); setShowCustomForm(false); setMeasureInches('');
  };

  const goBack = () => {
    if (selectionStep === 'measure') { setSelectionStep('chain'); setSelectedChain(null); setMeasureInches(''); }
    else if (selectionStep === 'chain') { if (selectedNonChainType) goHome(); else { setSelectionStep('material'); setSelectedMaterial(null); } }
    else if (selectionStep === 'material') goHome();
  };

  // ── Add to cart handlers ───────────────────────────────────────────────

  const selectCategory = (pt: ProductType) => {
    setSelectedProductType(pt); setSelectedMaterial(null); setSelectedChain(null);
    setSelectedNonChainType(null); setShowCustomForm(false); setSelectionStep('material');
  };

  const selectMaterial = (material: string) => {
    setSelectedMaterial(material); setSelectedChain(null); setSelectionStep('chain');
  };

  const selectChain = (chain: InventoryItem) => {
    if (!selectedProductType) return;
    const priceRow = chainPrices.find((p) => p.inventory_item_id === chain.id && p.product_type_id === selectedProductType.id);
    if (chain.pricing_mode === 'per_inch') {
      setSelectedChain(chain); setMeasureInches(String(selectedProductType.default_inches || '')); setSelectionStep('measure');
    } else {
      const price = priceRow ? Number(priceRow.sell_price) : Number(chain.sell_price);
      cart.addItem({
        inventory_item_id: chain.id, name: `${chain.name} ${selectedProductType.name}`, quantity: 1, unit_price: price,
        discount_type: null, discount_value: 0, product_type_id: selectedProductType.id, product_type_name: selectedProductType.name,
        inches_used: priceRow?.default_inches ? Number(priceRow.default_inches) : Number(selectedProductType.default_inches), pricing_mode: 'per_product',
      });
      toast.success(`Added ${selectedProductType.name}`);
      goHome();
    }
  };

  const addMeasuredChain = () => {
    if (!selectedChain || !selectedProductType || !measureInches) return;
    const inches = Number(measureInches); if (inches <= 0) return;
    const price = Math.round(inches * Number(selectedChain.sell_price) * 100) / 100;
    cart.addItem({
      inventory_item_id: selectedChain.id, name: `${selectedChain.name} ${selectedProductType.name}`, quantity: 1, unit_price: price,
      discount_type: null, discount_value: 0, product_type_id: selectedProductType.id, product_type_name: selectedProductType.name,
      inches_used: inches, pricing_mode: 'per_inch',
    });
    toast.success(`Added ${selectedProductType.name} (${inches} in)`); goHome();
  };

  const addNonChainItem = (item: InventoryItem) => {
    cart.addItem({ inventory_item_id: item.id, name: item.name, quantity: 1, unit_price: Number(item.sell_price),
      discount_type: null, discount_value: 0, product_type_id: null, product_type_name: null, inches_used: null, pricing_mode: null });
    toast.success(`Added ${item.name}`);
  };

  const addCustomItem = () => {
    if (!customItem.name || !customItem.price) return;
    cart.addItem({ inventory_item_id: null, name: customItem.name, quantity: 1, unit_price: Number(customItem.price),
      discount_type: null, discount_value: 0, product_type_id: null, product_type_name: null, inches_used: null, pricing_mode: null });
    toast.success(`Added ${customItem.name}`); setCustomItem({ name: '', price: '' }); goHome();
  };

  // ── Queue: Start Sale from check-in strip ──────────────────────────────

  const handleQueueStartSale = async (entry: any) => {
    setActiveQueueEntry(entry);

    // Update queue entry status to 'serving'
    await supabase
      .from('queue_entries')
      .update({ status: 'serving' })
      .eq('id', entry.id);

    // Pre-fill receipt fields
    if (entry.email) {
      setReceiptEmail(entry.email);
    } else if (entry.client_id) {
      const { data: client } = await supabase.from('clients').select('email, phone').eq('id', entry.client_id).single();
      if (client?.email) setReceiptEmail(client.email);
      if (client?.phone && !entry.phone) setReceiptPhone(client.phone);
    }
    if (entry.phone) {
      setReceiptPhone(entry.phone);
    }

    // Link client to cart
    if (entry.client_id) {
      cart.setClientId(entry.client_id);
    }
  };

  // ── Queue: Cancel Serving ──────────────────────────────────────────────

  const cancelServing = async () => {
    if (!activeQueueEntry) return;

    await supabase
      .from('queue_entries')
      .update({ status: 'waiting' })
      .eq('id', activeQueueEntry.id);

    setActiveQueueEntry(null);
    setReceiptEmail('');
    setReceiptPhone('');
    cart.setClientId(null);
  };

  // ── Sale completion ────────────────────────────────────────────────────

  const completeSale = async () => {
    if (!tenant || !cart.payment_method) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: sale, error: saleErr } = await supabase.from('sales').insert({
        tenant_id: tenant.id, event_id: null, client_id: cart.client_id,
        subtotal: cart.subtotal, discount_amount: cart.discount_amount, tax_amount: cart.tax_amount,
        tip_amount: cart.tip_amount, platform_fee_amount: cart.platform_fee_amount, total: cart.total,
        payment_method: cart.payment_method, payment_status: 'completed',
        platform_fee_rate: PLATFORM_FEE_RATES[tenant.subscription_tier], fee_handling: tenant.fee_handling,
        status: 'completed', receipt_email: receiptEmail || null, receipt_phone: receiptPhone || null,
        notes: cart.notes || 'Store sale', completed_by: user?.id,
      }).select().single();
      if (saleErr || !sale) throw saleErr || new Error('Failed to create sale');

      const saleItems = cart.items.map((item) => ({
        sale_id: sale.id, tenant_id: tenant.id, inventory_item_id: item.inventory_item_id, name: item.name,
        quantity: item.quantity, unit_price: item.unit_price, discount_type: item.discount_type, discount_value: item.discount_value,
        line_total: item.line_total, product_type_id: item.product_type_id || null, product_type_name: item.product_type_name || null,
        inches_used: item.inches_used || null,
      }));
      await supabase.from('sale_items').insert(saleItems);

      for (const item of cart.items) {
        if (!item.inventory_item_id) continue;
        const inv = inventory.find((i) => i.id === item.inventory_item_id); if (!inv) continue;
        const deduct = inv.type === 'chain' && item.inches_used ? item.inches_used : item.quantity;
        await supabase.from('inventory_items').update({ quantity_on_hand: Math.max(0, inv.quantity_on_hand - deduct) }).eq('id', inv.id);
      }

      // Mark queue entry as served (if started from check-in strip)
      if (activeQueueEntry) {
        await supabase
          .from('queue_entries')
          .update({ status: 'served', served_at: new Date().toISOString() })
          .eq('id', activeQueueEntry.id);
        setActiveQueueEntry(null);
      }

      setTodaySales((p) => ({ count: p.count + 1, total: p.total + Number(sale.total) }));
      cart.reset(); setStep('items'); setReceiptEmail(''); setReceiptPhone(''); goHome();
      toast.success('Sale completed');
    } catch (err: any) { toast.error(err?.message || 'Sale failed'); }
    finally { setProcessing(false); }
  };

  // ── Loading ────────────────────────────────────────────────────────────

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--text-primary)] border-t-transparent mb-4" />
          <p className="text-[var(--text-tertiary)] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // ── QR data ────────────────────────────────────────────────────────────

  const qrUrl = generateQRData(tenant.slug);

  // ── Shared card classes ────────────────────────────────────────────────

  const cardBase = 'bg-white border border-[var(--border-default)] text-left cursor-pointer transition-all duration-200 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-px active:scale-[0.97]';
  const cardPrimary = `${cardBase} rounded-2xl p-7 min-h-[140px] shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]`;
  const cardSecondary = `${cardBase} rounded-xl p-5 min-h-[100px] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]`;
  const cardCompact = `${cardBase} rounded-xl p-4 min-h-[72px] border-[var(--border-subtle)] shadow-none hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]`;
  const cardDisabled = 'opacity-30 cursor-not-allowed hover:shadow-none hover:translate-y-0 active:scale-100';
  const sectionLabel = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] mb-3 pl-0.5';
  const backButton = 'flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors mb-5';
  const pageTitle = 'text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-tight';

  return (
    <div className="fixed inset-0 bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-[var(--border-default)] px-5 py-3.5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard')}
            className="w-10 h-10 rounded-xl border border-[var(--border-default)] bg-white flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors">
            <BackArrow />
          </button>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--text-primary)] text-[15px]">{tenant.name}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-[0.05em] font-medium">Store Mode</div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* QR Code button */}
          <button
            onClick={() => setShowQR(true)}
            className="p-2 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-tertiary)] min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Show QR Code"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
          </button>

          {/* Desktop stats */}
          <div className="hidden sm:flex items-center gap-5 text-sm">
            <div className="text-center">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.05em] font-semibold">Sales</div>
              <div className="text-lg font-bold text-[var(--text-primary)]">{todaySales.count}</div>
            </div>
            <div className="w-px h-7 bg-[var(--border-default)]" />
            <div className="text-center">
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.05em] font-semibold">Revenue</div>
              <div className="text-lg font-bold text-[var(--text-primary)] font-mono">${todaySales.total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Check-In Strip ── */}
      <MiniQueueStrip
        tenantId={tenant.id}
        mode="store"
        onStartSale={handleQueueStartSale}
        isServingActive={!!activeQueueEntry}
      />

      {/* ── Serving Banner ── */}
      {activeQueueEntry && step === 'items' && (
        <div
          className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border-default)]"
          style={{ backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, white)' }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {activeQueueEntry.name?.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <span className="text-sm font-medium text-[var(--text-primary)]">
              Serving: {activeQueueEntry.name}
            </span>
          </div>
          <button
            onClick={cancelServing}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/50 text-[var(--text-tertiary)]"
            title="Cancel serving"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex overflow-hidden relative">

        <div className="flex-1 overflow-y-auto bg-[var(--surface-raised)]">
          {/* Mobile stats */}
          <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-[var(--border-subtle)] text-xs">
            <span className="text-[var(--text-tertiary)]"><span className="font-semibold text-[var(--text-primary)]">{todaySales.count}</span> sales today</span>
            <span className="text-[var(--text-tertiary)]">Revenue: <span className="font-bold text-[var(--text-primary)] font-mono">${todaySales.total.toFixed(2)}</span></span>
          </div>

          <div className="p-5 pb-28 md:pb-5 max-w-[720px] mx-auto">

            {/* ═══ ITEMS STEP ═══ */}
            {step === 'items' && (
              <div>

                {/* ── CATEGORY VIEW ── */}
                {selectionStep === 'category' && !showCustomForm && (
                  <div>
                    {/* Primary services — hero cards */}
                    {primaryTypes.length > 0 && (
                      <div className="mb-4">
                        <div className={sectionLabel}>Services</div>
                        <div className="grid grid-cols-2 gap-3">
                          {primaryTypes.map((pt) => {
                            const count = chainAvailCount(pt.id);
                            return (
                              <button key={pt.id} onClick={() => count > 0 && selectCategory(pt)}
                                disabled={count === 0}
                                className={`${cardPrimary} flex flex-col justify-between ${count === 0 ? cardDisabled : ''}`}>
                                <div>
                                  <div className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">{pt.name}</div>
                                  <div className="text-[12px] text-[var(--text-tertiary)] mt-1.5 font-medium">{pt.default_inches}&quot; standard</div>
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] font-medium mt-4">
                                  <span>{count} chain{count !== 1 ? 's' : ''}</span>
                                  <ChevronRight />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Secondary services — medium cards */}
                    {secondaryTypes.length > 0 && (
                      <div className="mb-4">
                        <div className="grid grid-cols-3 gap-2.5">
                          {secondaryTypes.map((pt) => {
                            const count = chainAvailCount(pt.id);
                            return (
                              <button key={pt.id} onClick={() => count > 0 && selectCategory(pt)}
                                disabled={count === 0}
                                className={`${cardSecondary} flex flex-col justify-between ${count === 0 ? cardDisabled : ''}`}>
                                <div className="text-[16px] font-semibold text-[var(--text-primary)]">{pt.name}</div>
                                <div className="text-[11px] text-[var(--text-tertiary)] mt-2 font-medium">{pt.default_inches}&quot; standard</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Add-ons + Custom — compact cards */}
                    {(nonChainTypes.length > 0 || true) && (
                      <div>
                        <div className={sectionLabel}>Add-ons</div>
                        <div className="grid grid-cols-3 gap-2">
                          {nonChainTypes.map((type) => {
                            const items = inventory.filter((i) => i.type === type && i.quantity_on_hand > 0);
                            return (
                              <button key={type} onClick={() => { setSelectedNonChainType(type); setSelectedProductType(null); setSelectedMaterial(null); setShowCustomForm(false); setSelectionStep('chain'); }}
                                disabled={items.length === 0}
                                className={`${cardCompact} flex flex-col justify-between ${items.length === 0 ? cardDisabled : ''}`}>
                                <div className="text-[14px] font-semibold text-[var(--text-secondary)]">{NON_CHAIN_LABELS[type] || type}</div>
                                <div className="text-[11px] text-[var(--text-tertiary)] mt-1">{items.length} items</div>
                              </button>
                            );
                          })}
                          <button onClick={() => { setShowCustomForm(true); setSelectedProductType(null); setSelectedMaterial(null); setSelectedNonChainType(null); }}
                            className="bg-white border border-dashed border-[var(--border-strong)] rounded-xl p-4 min-h-[72px] text-left cursor-pointer transition-all hover:border-[var(--text-tertiary)] flex flex-col justify-between">
                            <div className="text-[14px] font-semibold text-[var(--text-tertiary)]">Custom</div>
                            <div className="text-[11px] text-[var(--text-tertiary)] mt-1">Name your price</div>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── CUSTOM FORM ── */}
                {selectionStep === 'category' && showCustomForm && (
                  <div>
                    <button onClick={goHome} className={backButton}><BackArrow /> Back</button>
                    <div className="max-w-sm mx-auto space-y-5 pt-8">
                      <h2 className={pageTitle + ' text-center'}>Custom Item</h2>
                      <input className="w-full h-14 px-4 rounded-xl border border-[var(--border-default)] bg-white text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] text-lg transition-all"
                        placeholder="Item name" value={customItem.name}
                        onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })} autoFocus />
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[var(--text-tertiary)] font-mono">$</span>
                        <input className="w-full h-14 pl-9 pr-4 rounded-xl border border-[var(--border-default)] bg-white text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-lg font-mono focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] transition-all"
                          type="number" step="0.01" min="0" placeholder="0.00" value={customItem.price}
                          onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem(); }} />
                      </div>
                      <button onClick={addCustomItem} disabled={!customItem.name || !customItem.price}
                        className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                )}

                {/* ── MATERIAL SELECTION ── */}
                {selectionStep === 'material' && selectedProductType && (
                  <div>
                    <button onClick={goBack} className={backButton}><BackArrow /> Back</button>
                    <div className="mb-6">
                      <div className={sectionLabel}>Select Material</div>
                      <h2 className={pageTitle}>{selectedProductType.name}</h2>
                    </div>
                    {materialsForProductType.length === 0 ? (
                      <div className="text-center py-16">
                        <p className="text-[var(--text-tertiary)] text-sm">No chains with pricing set for {selectedProductType.name}.</p>
                        <p className="text-xs text-[var(--text-tertiary)] mt-2">Set up pricing in Inventory for your chains.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {materialsForProductType.map(([material, count]) => (
                          <button key={material} onClick={() => selectMaterial(material)}
                            className={`${cardPrimary} flex flex-col justify-between`}>
                            <div className="text-[18px] font-semibold text-[var(--text-primary)]">{material}</div>
                            <div className="flex items-center justify-between mt-3">
                              <span className="text-[12px] text-[var(--text-tertiary)] font-medium">{count} chain{count !== 1 ? 's' : ''}</span>
                              <ChevronRight />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── CHAIN SELECTION ── */}
                {selectionStep === 'chain' && selectedProductType && selectedMaterial && (
                  <div>
                    <button onClick={goBack} className={backButton}><BackArrow /> Back</button>
                    <div className="mb-6">
                      <div className={sectionLabel}>{selectedProductType.name} / {selectedMaterial}</div>
                      <h2 className={pageTitle}>Select Chain</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {chainsForMaterial.map((chain) => (
                        <button key={chain.id} onClick={() => selectChain(chain)}
                          className={`${cardSecondary} flex flex-col justify-between`}>
                          <div>
                            <div className="text-[15px] font-semibold text-[var(--text-primary)]">{chain.name}</div>
                            <div className="text-[12px] text-[var(--text-tertiary)] mt-1">{chain.quantity_on_hand.toFixed(0)} {chain.unit} in stock</div>
                          </div>
                          <div className="text-[20px] font-bold text-[var(--text-primary)] font-mono mt-3 tracking-tight">{getChainPrice(chain)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── NON-CHAIN ITEMS ── */}
                {selectionStep === 'chain' && selectedNonChainType && (
                  <div>
                    <button onClick={goHome} className={backButton}><BackArrow /> Back</button>
                    <div className="mb-6">
                      <div className={sectionLabel}>{NON_CHAIN_LABELS[selectedNonChainType] || selectedNonChainType}</div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {nonChainItems.map((item) => (
                        <button key={item.id} onClick={() => addNonChainItem(item)}
                          className={`${cardSecondary} flex flex-col justify-between`}>
                          <div>
                            <div className="text-[15px] font-semibold text-[var(--text-primary)]">{item.name}</div>
                            <div className="text-[12px] text-[var(--text-tertiary)] mt-1">{item.material && `${item.material} — `}{item.quantity_on_hand} left</div>
                          </div>
                          <div className="text-[20px] font-bold text-[var(--text-primary)] font-mono mt-3 tracking-tight">${Number(item.sell_price).toFixed(2)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── MEASUREMENT (per-inch) ── */}
                {selectionStep === 'measure' && selectedChain && selectedProductType && (
                  <div>
                    <button onClick={goBack} className={backButton}><BackArrow /> Back</button>
                    <div className="max-w-sm mx-auto pt-8 space-y-8">
                      <div className="text-center">
                        <div className={sectionLabel + ' text-center'}>
                          {selectedChain.name} / {selectedProductType.name}
                        </div>
                        <div className="text-sm text-[var(--text-tertiary)]">${Number(selectedChain.sell_price).toFixed(2)}/in</div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2.5 text-center">Measured Inches</label>
                        <input type="number" step="0.25" min="0.25" value={measureInches} onChange={(e) => setMeasureInches(e.target.value)}
                          className="w-full h-20 px-4 rounded-2xl border border-[var(--border-default)] bg-white text-[var(--text-primary)] text-center text-[40px] font-mono font-semibold focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] transition-all tracking-tight"
                          autoFocus onKeyDown={(e) => { if (e.key === 'Enter') addMeasuredChain(); }} />
                      </div>
                      {measureInches && Number(measureInches) > 0 && (
                        <div className="text-center">
                          <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)] font-semibold mb-2">Calculated Price</div>
                          <div className="text-[48px] font-bold text-[var(--text-primary)] font-mono tracking-tighter leading-none">
                            ${(Number(measureInches) * Number(selectedChain.sell_price)).toFixed(2)}
                          </div>
                        </div>
                      )}
                      <button onClick={addMeasuredChain} disabled={!measureInches || Number(measureInches) <= 0}
                        className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
                        Add to Cart
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TIP / PAYMENT / RECEIPT STEPS ═══ */}
            {step === 'tip' && (
              <div className="max-w-sm mx-auto py-8 space-y-6">
                <h2 className={pageTitle + ' text-center'}>Add a Tip</h2>
                <p className="text-[var(--text-tertiary)] text-center text-sm">Subtotal: <span className="font-mono font-medium">${(cart.subtotal + cart.tax_amount).toFixed(2)}</span></p>
                <div className="grid grid-cols-3 gap-3">
                  {TIP_PRESETS.map((amount) => (
                    <button key={amount} onClick={() => cart.setTip(amount)}
                      className={`py-5 rounded-2xl text-xl font-bold transition-all min-h-[56px] ${
                        cart.tip_amount === amount
                          ? 'bg-[var(--text-primary)] text-white shadow-md' : 'bg-white border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:shadow-sm'
                      }`}>{amount === 0 ? 'None' : `$${amount}`}</button>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">Custom tip</label>
                  <input type="number" step="0.01" min="0" className="w-full h-14 px-4 rounded-xl border border-[var(--border-default)] bg-white text-[var(--text-primary)] text-center text-xl font-mono focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] transition-all"
                    placeholder="$0.00" value={cart.tip_amount || ''} onChange={(e) => cart.setTip(Number(e.target.value) || 0)} />
                </div>
                <button onClick={() => setStep('payment')} className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>Continue to Payment</button>
              </div>
            )}

            {step === 'payment' && (
              <div className="max-w-sm mx-auto py-8 space-y-6">
                <h2 className={pageTitle + ' text-center'}>Select Payment</h2>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((pm) => (
                    <button key={pm.value} onClick={() => cart.setPaymentMethod(pm.value)}
                      className={`py-7 rounded-2xl text-center transition-all min-h-[80px] ${
                        cart.payment_method === pm.value
                          ? 'bg-[var(--text-primary)] text-white shadow-md' : 'bg-white border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:shadow-sm'
                      }`}>
                      <div className="text-lg font-bold">{pm.label}</div>
                    </button>
                  ))}
                </div>
                {cart.payment_method && (
                  <button onClick={completeSale} disabled={processing} className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm disabled:opacity-60"
                    style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>{processing ? 'Processing...' : `Complete Sale — $${cart.total.toFixed(2)}`}</button>
                )}
              </div>
            )}


          </div>
        </div>

        {/* Desktop Cart Sidebar */}
        <div className="hidden md:flex w-80 lg:w-[380px] bg-white border-l border-[var(--border-default)] flex-col shrink-0">
          <CartPanel cart={cart} step={step} setStep={setStep} tenant={tenant} />
        </div>

        {/* Mobile Cart Sheet */}
        {showCart && (
          <div className="md:hidden fixed inset-0 z-40 flex flex-col">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCart(false)} />
            <div className="relative mt-auto bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                  Cart — {cart.items.length} item{cart.items.length !== 1 ? 's' : ''}
                </span>
                <button onClick={() => setShowCart(false)} className="p-2 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-tertiary)] min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1">
                <CartPanel cart={cart} step={step} setStep={setStep} tenant={tenant} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Cart Button */}
      {cart.items.length > 0 && !showCart && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-30">
          <button onClick={() => setShowCart(true)}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]"
            style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
            <span className="flex items-center gap-2">
              <span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">{cart.items.length}</span>
              <span className="font-semibold">View Cart</span>
            </span>
            <span className="font-bold font-mono text-lg">${cart.total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── QR Code Modal ── */}
      {showQR && tenant && !showFullScreenQR && (
        <Modal isOpen={true} onClose={() => setShowQR(false)} size="lg">
          <ModalHeader>
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Waiver Check-In</h2>
            <p className="text-sm text-[var(--text-tertiary)] mt-1">
              Customers scan this to sign the waiver and check in.
            </p>
          </ModalHeader>
          <ModalBody className="flex flex-col items-center py-4">
            <QRCode
              url={qrUrl}
              size={280}
              tenantName={tenant.name}
              showDownload
              showPrint
            />
            <p className="text-xs text-[var(--text-tertiary)] mt-4 text-center font-mono break-all">
              {typeof window !== 'undefined' ? `${window.location.origin}/waiver?tenant=${tenant.slug}` : ''}
            </p>
          </ModalBody>
          <ModalFooter>
            <div className="flex gap-2 w-full">
              <Button variant="secondary" className="flex-1" onClick={() => setShowFullScreenQR(true)}>
                Full Screen
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => setShowQR(false)}>
                Done
              </Button>
            </div>
          </ModalFooter>
        </Modal>
      )}

      {/* ── Full Screen QR ── */}
      {showFullScreenQR && tenant && (
        <FullScreenQR
          url={qrUrl}
          tenantName={tenant.name}
          eventName="Scan to sign waiver & check in"
          onClose={() => setShowFullScreenQR(false)}
        />
      )}
    </div>
  );
}