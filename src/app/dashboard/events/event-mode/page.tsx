// ============================================================================
// Event Mode POS — src/app/dashboard/events/event-mode/page.tsx
// ============================================================================
// Luxury step-down product selection with visual hierarchy.
// Includes: Jump ring auto-deduction, QR codes, receipt sending (email+SMS),
// post-sale confirmation, client find/create, inventory movement logging,
// chain product fields, per-product and per-inch pricing.
// Task A: Receipt step removed, Suspense wrapper added.
// Task B: Mini queue strip + queue-POS client linking.
// ============================================================================

'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { useCartStore } from '@/hooks/use-cart';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { PLATFORM_FEE_RATES } from '@/types';
import { generateQRData } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { QRCode, FullScreenQR } from '@/components/QRCode';
import CartPanel from '@/components/CartPanel';
import JumpRingPickerModal from '@/components/JumpRingPickerModal';
import MiniQueueStrip from '@/components/MiniQueueStrip';
import type { QueueEntry } from '@/components/MiniQueueStrip';
import type {
  InventoryItem, Event, TaxProfile, PaymentMethod, ProductType, ChainProductPrice, JumpRingResolution, CartItem,
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
  jump_ring: 'Jump Rings', charm: 'Charms', connector: 'Connectors', other: 'Other Items',
};

interface CompletedSaleData {
  saleId: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; lineTotal: number }>;
  subtotal: number; taxAmount: number; taxRate: number; tipAmount: number;
  total: number; paymentMethod: string; saleDate: string; clientId: string | null;
}

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

// ============================================================================
// Jump Ring Calculation Logic
// ============================================================================

function calculateJumpRingNeeds(
  cartItems: CartItem[],
  jumpRingInventory: InventoryItem[]
): JumpRingResolution[] {
  const resolutions: JumpRingResolution[] = [];

  for (const item of cartItems) {
    if (!item.inventory_item_id) continue;

    const invType = item._inventory_type;
    if (!invType) continue;

    let jumpRingsNeeded = 0;

    if (invType === 'chain') {
      const perUnit = item._jump_rings_required ?? 1;
      jumpRingsNeeded = perUnit * item.quantity;
    } else if (invType === 'charm' || invType === 'connector') {
      jumpRingsNeeded = 1 * item.quantity;
    }

    if (jumpRingsNeeded === 0) continue;

    const itemMaterial = (item._material || '').toLowerCase().trim();
    const matchedJumpRing = itemMaterial
      ? jumpRingInventory.find(
          (jr) =>
            jr.is_active &&
            (jr.material || '').toLowerCase().trim() === itemMaterial
        )
      : null;

    resolutions.push({
      cart_item_id: item.id,
      cart_item_name: item.name,
      jump_rings_needed: jumpRingsNeeded,
      jump_ring_inventory_id: matchedJumpRing?.id || null,
      jump_ring_cost_each: matchedJumpRing ? Number(matchedJumpRing.cost_per_unit) : 0,
      material_name: item._material || 'Unknown',
      resolved: !!matchedJumpRing,
    });
  }

  return resolutions;
}

function getLowStockWarnings(
  resolutions: JumpRingResolution[],
  jumpRingInventory: InventoryItem[]
): string[] {
  const warnings: string[] = [];
  const needsPerJR: Record<string, number> = {};
  for (const r of resolutions) {
    if (!r.jump_ring_inventory_id) continue;
    needsPerJR[r.jump_ring_inventory_id] =
      (needsPerJR[r.jump_ring_inventory_id] || 0) + r.jump_rings_needed;
  }

  for (const [jrId, needed] of Object.entries(needsPerJR)) {
    const jr = jumpRingInventory.find((i) => i.id === jrId);
    if (jr && jr.quantity_on_hand < needed) {
      warnings.push(
        `${jr.name} has ${jr.quantity_on_hand} left (need ${needed} for this sale)`
      );
    }
  }
  return warnings;
}

// ============================================================================
// Main Component (Inner — wrapped by Suspense)
// ============================================================================

function EventModePageInner() {
  const { tenant } = useTenant();
  const params = useSearchParams();
  const router = useRouter();
  const eventId = params.get('eventId');

  const [event, setEvent] = useState<Event | null>(null);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [chainPrices, setChainPrices] = useState<ChainProductPrice[]>([]);
  const [step, setStep] = useState<CheckoutStep>('items');
  const [receiptEmail, setReceiptEmail] = useState('');
  const [receiptPhone, setReceiptPhone] = useState('');
  const [processing, setProcessing] = useState(false);
  const [todaySales, setTodaySales] = useState({ count: 0, total: 0 });
  const [showQR, setShowQR] = useState(false);
  const [showFullScreenQR, setShowFullScreenQR] = useState(false);
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

  // Receipt / confirmation
  const [completedSale, setCompletedSale] = useState<CompletedSaleData | null>(null);
  const [receiptConfig, setReceiptConfig] = useState<{ email: boolean; sms: boolean }>({ email: false, sms: false });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [smsError, setSmsError] = useState('');

  // Jump ring state
  const [showJumpRingPicker, setShowJumpRingPicker] = useState(false);
  const [jumpRingResolutions, setJumpRingResolutions] = useState<JumpRingResolution[]>([]);
  const [pendingJumpRingLowStockWarnings, setPendingJumpRingLowStockWarnings] = useState<string[]>([]);

  // ── Task B: Queue integration state ──
  const [activeQueueEntry, setActiveQueueEntry] = useState<QueueEntry | null>(null);

  const cart = useCartStore();
  const supabase = createClient();

  // Pre-filter jump ring inventory for quick access
  const jumpRingInventory = useMemo(
    () => inventory.filter((i) => i.type === 'jump_ring' && i.is_active),
    [inventory]
  );

  // ── Check receipt config ──

  useEffect(() => {
    fetch('/api/receipts/config').then((r) => r.json()).then((cfg) => setReceiptConfig(cfg)).catch(() => {});
  }, []);

  // ── Load event + data ──

  useEffect(() => {
    if (!tenant || !eventId) return;
    const load = async () => {
      const { data: ev } = await supabase
        .from('events').select('*, tax_profiles(*)').eq('id', eventId).single();
      if (ev) {
        setEvent(ev as Event);
        if (ev.tax_profiles) {
          const tp = ev.tax_profiles as unknown as TaxProfile;
          setTaxProfile(tp); cart.setTaxRate(Number(tp.rate));
        }
      }

      const { data: items } = await supabase
        .from('inventory_items').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('type').order('name');
      setInventory((items || []) as InventoryItem[]);

      // Load product types — filter by event_product_types if any exist
      const { data: pts } = await supabase
        .from('product_types').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('sort_order');
      const allPts = (pts || []) as ProductType[];

      // Check for event-specific product type filtering
      const { data: eventPts } = await supabase
        .from('event_product_types').select('product_type_id').eq('event_id', eventId);
      if (eventPts && eventPts.length > 0) {
        const allowedIds = new Set(eventPts.map((ep: any) => ep.product_type_id));
        setProductTypes(allPts.filter((pt) => allowedIds.has(pt.id)));
      } else {
        setProductTypes(allPts);
      }

      const { data: prices } = await supabase
        .from('chain_product_prices').select('*').eq('tenant_id', tenant.id).eq('is_active', true);
      setChainPrices((prices || []) as ChainProductPrice[]);

      cart.setPlatformFeeRate(PLATFORM_FEE_RATES[tenant.subscription_tier]);
      cart.setFeeHandling(tenant.fee_handling);

      const today = new Date(); today.setHours(0, 0, 0, 0);
      const { data: sales } = await supabase
        .from('sales').select('total').eq('event_id', eventId).eq('status', 'completed').gte('created_at', today.toISOString());
      if (sales) setTodaySales({ count: sales.length, total: sales.reduce((s, r) => s + Number(r.total), 0) });
    };
    load();
  }, [tenant, eventId]);

  // ── Derived data ──

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

  // ── Helpers ──

  const chainAvailCount = (ptId: string) =>
    chains.filter((c) => c.quantity_on_hand > 0 && chainPrices.some((p) => p.inventory_item_id === c.id && p.product_type_id === ptId)).length;

  const getChainPrice = (chain: InventoryItem): string => {
    if (!selectedProductType) return `$${Number(chain.sell_price).toFixed(2)}`;
    if (chain.pricing_mode === 'per_inch') return `$${Number(chain.sell_price).toFixed(2)}/in`;
    const row = chainPrices.find((p) => p.inventory_item_id === chain.id && p.product_type_id === selectedProductType.id);
    return row ? `$${Number(row.sell_price).toFixed(2)}` : `$${Number(chain.sell_price).toFixed(2)}`;
  };

  const paymentLabels: Record<string, string> = { card_present: 'Card', card_not_present: 'Card (Online)', cash: 'Cash', venmo: 'Venmo', other: 'Other' };

  // ── Navigation ──

  const goHome = () => {
    setSelectionStep('category'); setSelectedProductType(null); setSelectedMaterial(null);
    setSelectedChain(null); setSelectedNonChainType(null); setShowCustomForm(false); setMeasureInches('');
  };

  const goBack = () => {
    if (selectionStep === 'measure') { setSelectionStep('chain'); setSelectedChain(null); setMeasureInches(''); }
    else if (selectionStep === 'chain') { if (selectedNonChainType) goHome(); else { setSelectionStep('material'); setSelectedMaterial(null); } }
    else if (selectionStep === 'material') goHome();
  };

  // ── Add to cart (with jump ring metadata) ──

  const selectCategory = (pt: ProductType) => {
    setSelectedProductType(pt); setSelectedMaterial(null); setSelectedChain(null);
    setSelectedNonChainType(null); setShowCustomForm(false); setSelectionStep('material');
  };

  const selectMaterial = (material: string) => { setSelectedMaterial(material); setSelectedChain(null); setSelectionStep('chain'); };

  const selectChain = (chain: InventoryItem) => {
    if (!selectedProductType) return;
    const priceRow = chainPrices.find((p) => p.inventory_item_id === chain.id && p.product_type_id === selectedProductType.id);
    if (chain.pricing_mode === 'per_inch') {
      setSelectedChain(chain); setMeasureInches(String(selectedProductType.default_inches || '')); setSelectionStep('measure');
    } else {
      const price = priceRow ? Number(priceRow.sell_price) : Number(chain.sell_price);
      cart.addItem({ inventory_item_id: chain.id, name: `${chain.name} ${selectedProductType.name}`, quantity: 1, unit_price: price,
        discount_type: null, discount_value: 0, product_type_id: selectedProductType.id, product_type_name: selectedProductType.name,
        inches_used: priceRow?.default_inches ? Number(priceRow.default_inches) : Number(selectedProductType.default_inches), pricing_mode: 'per_product',
        _jump_rings_required: selectedProductType.jump_rings_required ?? 1, _inventory_type: 'chain', _material: chain.material });
      toast.success(`Added ${selectedProductType.name}`); goHome();
    }
  };

  const addMeasuredChain = () => {
    if (!selectedChain || !selectedProductType || !measureInches) return;
    const inches = Number(measureInches); if (inches <= 0) return;
    const price = Math.round(inches * Number(selectedChain.sell_price) * 100) / 100;
    cart.addItem({ inventory_item_id: selectedChain.id, name: `${selectedChain.name} ${selectedProductType.name}`, quantity: 1, unit_price: price,
      discount_type: null, discount_value: 0, product_type_id: selectedProductType.id, product_type_name: selectedProductType.name,
      inches_used: inches, pricing_mode: 'per_inch',
      _jump_rings_required: selectedProductType.jump_rings_required ?? 1, _inventory_type: 'chain', _material: selectedChain.material });
    toast.success(`Added ${selectedProductType.name} (${inches} in)`); goHome();
  };

  const addNonChainItem = (item: InventoryItem) => {
    cart.addItem({ inventory_item_id: item.id, name: item.name, quantity: 1, unit_price: Number(item.sell_price),
      discount_type: null, discount_value: 0, product_type_id: null, product_type_name: null, inches_used: null, pricing_mode: null,
      _jump_rings_required: null, _inventory_type: item.type, _material: item.material });
    toast.success(`Added ${item.name}`);
  };

  const addCustomItem = () => {
    if (!customItem.name || !customItem.price) return;
    cart.addItem({ inventory_item_id: null, name: customItem.name, quantity: 1, unit_price: Number(customItem.price),
      discount_type: null, discount_value: 0, product_type_id: null, product_type_name: null, inches_used: null, pricing_mode: null,
      _jump_rings_required: null, _inventory_type: null, _material: null });
    toast.success(`Added ${customItem.name}`); setCustomItem({ name: '', price: '' }); goHome();
  };

  // ── Client find/create ──

  const findOrCreateClient = async (email: string, phone: string): Promise<string | null> => {
    if (!tenant) return null;
    try {
      if (email) {
        const { data } = await supabase.from('clients').select('id').eq('tenant_id', tenant.id).ilike('email', email).limit(1).single();
        if (data) return data.id;
      }
      if (phone) {
        const norm = phone.replace(/[^\d+]/g, '');
        const { data } = await supabase.from('clients').select('id').eq('tenant_id', tenant.id).eq('phone', norm).limit(1).single();
        if (data) return data.id;
      }
      if (email || phone) {
        const { data } = await supabase.from('clients').insert({ tenant_id: tenant.id, email: email || null, phone: phone ? phone.replace(/[^\d+]/g, '') : null }).select('id').single();
        if (data) return data.id;
      }
    } catch { console.warn('[Client linkage] Could not find/create client'); }
    return null;
  };

  // ── Task B: Queue → POS integration ──

  const handleQueueStartSale = async (entry: QueueEntry) => {
    setActiveQueueEntry(entry);

    // Update queue entry status to 'serving'
    await supabase.from('queue_entries').update({ status: 'serving' }).eq('id', entry.id);

    // Pre-fill receipt email/phone from queue entry or client record
    if (!entry.email && entry.client_id) {
      const { data: client } = await supabase
        .from('clients')
        .select('email, phone')
        .eq('id', entry.client_id)
        .single();
      if (client?.email) setReceiptEmail(client.email);
      if (client?.phone) setReceiptPhone(client.phone);
    } else {
      if (entry.email) setReceiptEmail(entry.email);
      if (entry.phone) setReceiptPhone(entry.phone);
    }

    // Link client to cart
    if (entry.client_id) {
      cart.setClientId(entry.client_id);
    }
  };

  const cancelServing = async () => {
    if (!activeQueueEntry) return;
    // Reset queue entry back to waiting
    await supabase
      .from('queue_entries')
      .update({ status: 'waiting' })
      .eq('id', activeQueueEntry.id);

    setActiveQueueEntry(null);
    setReceiptEmail('');
    setReceiptPhone('');
    cart.setClientId(null);
  };

  // ── Sale completion — with jump ring auto-deduction ──

  const handleCompleteSale = () => {
    const resolutions = calculateJumpRingNeeds(cart.items, jumpRingInventory);
    const unresolvedItems = resolutions.filter((r) => !r.resolved);
    const lowStockWarnings = getLowStockWarnings(resolutions, jumpRingInventory);

    for (const warning of lowStockWarnings) {
      toast.warning(`⚠ Low jump ring stock: ${warning}`, { duration: 6000 });
    }

    if (unresolvedItems.length > 0) {
      setJumpRingResolutions(resolutions);
      setPendingJumpRingLowStockWarnings(lowStockWarnings);
      setShowJumpRingPicker(true);
    } else {
      setJumpRingResolutions(resolutions);
      completeSale(resolutions);
    }
  };

  const handleJumpRingPickerConfirm = (updatedResolutions: JumpRingResolution[]) => {
    const allResolutions = jumpRingResolutions.map((r) => {
      const updated = updatedResolutions.find((u) => u.cart_item_id === r.cart_item_id);
      return updated || r;
    });
    setShowJumpRingPicker(false);
    setJumpRingResolutions(allResolutions);
    completeSale(allResolutions);
  };

  const completeSale = async (resolutions: JumpRingResolution[]) => {
    if (!tenant || !eventId || !cart.payment_method) return;
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      let clientId = cart.client_id;
      if (!clientId && (receiptEmail || receiptPhone)) clientId = await findOrCreateClient(receiptEmail, receiptPhone);

      const saleData: CompletedSaleData = {
        saleId: '', items: cart.items.map((i: any) => ({ name: i.name, quantity: i.quantity, unitPrice: i.unit_price, lineTotal: i.line_total })),
        subtotal: cart.subtotal, taxAmount: cart.tax_amount, taxRate: cart.tax_rate, tipAmount: cart.tip_amount,
        total: cart.total, paymentMethod: cart.payment_method, saleDate: new Date().toISOString(), clientId,
      };

      const { data: sale, error: saleErr } = await supabase.from('sales').insert({
        tenant_id: tenant.id, event_id: eventId, client_id: clientId,
        subtotal: cart.subtotal, discount_amount: cart.discount_amount, tax_amount: cart.tax_amount,
        tip_amount: cart.tip_amount, platform_fee_amount: cart.platform_fee_amount, total: cart.total,
        payment_method: cart.payment_method, payment_status: 'completed',
        platform_fee_rate: PLATFORM_FEE_RATES[tenant.subscription_tier], fee_handling: tenant.fee_handling,
        status: 'completed', receipt_email: receiptEmail || null, receipt_phone: receiptPhone || null,
        notes: cart.notes, completed_by: user?.id,
      }).select().single();
      if (saleErr || !sale) throw saleErr || new Error('Failed to create sale');

      saleData.saleId = sale.id;

      // Build sale items with jump_ring_cost
      const saleItems = cart.items.map((item: any) => {
        const resolution = resolutions.find((r) => r.cart_item_id === item.id);
        const jumpRingCost = resolution
          ? resolution.jump_ring_cost_each * resolution.jump_rings_needed
          : 0;
        return {
          sale_id: sale.id, tenant_id: tenant.id, inventory_item_id: item.inventory_item_id, name: item.name,
          quantity: item.quantity, unit_price: item.unit_price, discount_type: item.discount_type, discount_value: item.discount_value,
          line_total: item.line_total, product_type_id: item.product_type_id || null, product_type_name: item.product_type_name || null,
          inches_used: item.inches_used || null, jump_ring_cost: jumpRingCost,
        };
      });
      await supabase.from('sale_items').insert(saleItems);

      // Inventory deduction + movements (chain inch-based deduction)
      for (const item of cart.items as any[]) {
        if (!item.inventory_item_id) continue;
        const inv = inventory.find((i) => i.id === item.inventory_item_id); if (!inv) continue;
        let deduct: number; let movementNotes: string;
        if (inv.type === 'chain' && item.inches_used) {
          deduct = item.inches_used * item.quantity;
          movementNotes = `${item.product_type_name || 'Chain'} (${item.inches_used} in)`;
        } else { deduct = item.quantity; movementNotes = ''; }

        await supabase.from('inventory_movements').insert({
          tenant_id: tenant.id, inventory_item_id: item.inventory_item_id, movement_type: 'sale',
          quantity: -deduct, reference_id: sale.id, notes: movementNotes || null, performed_by: user?.id,
        });
        await supabase.from('inventory_items').update({ quantity_on_hand: inv.quantity_on_hand - deduct }).eq('id', item.inventory_item_id);
      }

      // ── Jump Ring Deductions ──
      for (const resolution of resolutions) {
        if (!resolution.jump_ring_inventory_id) continue;
        const jr = inventory.find((i) => i.id === resolution.jump_ring_inventory_id);
        if (!jr) continue;

        await supabase.from('inventory_movements').insert({
          tenant_id: tenant.id, inventory_item_id: resolution.jump_ring_inventory_id, movement_type: 'sale',
          quantity: -resolution.jump_rings_needed, reference_id: sale.id,
          notes: `Auto-deducted for ${resolution.material_name} sale`, performed_by: user?.id,
        });
        await supabase.from('inventory_items')
          .update({ quantity_on_hand: jr.quantity_on_hand - resolution.jump_rings_needed })
          .eq('id', resolution.jump_ring_inventory_id);
      }

      // ── Task B: Mark queue entry as served ──
      if (activeQueueEntry) {
        await supabase.from('queue_entries').update({
          status: 'served',
          served_at: new Date().toISOString(),
        }).eq('id', activeQueueEntry.id);
        setActiveQueueEntry(null);
      }

      setTodaySales((s) => ({ count: s.count + 1, total: s.total + cart.total }));
      toast.success(`Sale completed — $${cart.total.toFixed(2)}`);
      setCompletedSale(saleData); cart.reset(); setStep('confirmation'); setShowCart(false);
      setEmailSent(false); setSmsSent(false); setEmailError(''); setSmsError('');
      setJumpRingResolutions([]);

      const { data: refreshed } = await supabase.from('inventory_items').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('type').order('name');
      if (refreshed) setInventory(refreshed as InventoryItem[]);
    } catch (err: any) { toast.error(err?.message || 'Sale failed'); }
    finally { setProcessing(false); }
  };

  // ── Receipt sending ──

  const sendEmailReceipt = async () => {
    if (!receiptEmail || !completedSale || !tenant) return;
    setSendingEmail(true); setEmailError('');
    try {
      const res = await fetch('/api/receipts/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: receiptEmail, tenantName: tenant.name, tenantAccentColor: tenant.brand_color || undefined,
          eventName: event?.name || undefined, saleDate: completedSale.saleDate, items: completedSale.items,
          subtotal: completedSale.subtotal, taxAmount: completedSale.taxAmount, taxRate: completedSale.taxRate,
          tipAmount: completedSale.tipAmount, total: completedSale.total, paymentMethod: completedSale.paymentMethod }) });
      const data = await res.json();
      if (data.sent) { setEmailSent(true); if (completedSale.saleId) await supabase.from('sales').update({ receipt_sent_at: new Date().toISOString() }).eq('id', completedSale.saleId); }
      else setEmailError(data.error || "Couldn't send email.");
    } catch { setEmailError("Couldn't send email."); }
    finally { setSendingEmail(false); }
  };

  const sendSMSReceipt = async () => {
    if (!receiptPhone || !completedSale || !tenant) return;
    setSendingSMS(true); setSmsError('');
    try {
      const res = await fetch('/api/receipts/sms', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: receiptPhone.replace(/[^\d+]/g, ''), tenantName: tenant.name,
          total: completedSale.total, itemCount: completedSale.items.reduce((s, i) => s + i.quantity, 0),
          paymentMethod: completedSale.paymentMethod }) });
      const data = await res.json();
      if (data.sent) { setSmsSent(true); if (completedSale.saleId) await supabase.from('sales').update({ receipt_sent_at: new Date().toISOString() }).eq('id', completedSale.saleId); }
      else setSmsError(data.error || "Couldn't send text.");
    } catch { setSmsError("Couldn't send text."); }
    finally { setSendingSMS(false); }
  };

  const startNewSale = () => {
    setStep('items'); setCompletedSale(null); setReceiptEmail(''); setReceiptPhone('');
    setEmailSent(false); setSmsSent(false); setEmailError(''); setSmsError('');
    setJumpRingResolutions([]); setActiveQueueEntry(null); goHome();
  };

  // ── Loading ──

  if (!event) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--text-primary)] border-t-transparent mb-4" />
          <p className="text-[var(--text-tertiary)] text-sm mb-4">Loading event...</p>
          <Button variant="secondary" onClick={() => router.push('/dashboard/events')}>Back to Events</Button>
        </div>
      </div>
    );
  }

  // ── Shared styles ──

  const cardBase = 'bg-white border border-[var(--border-default)] text-left cursor-pointer transition-all duration-200 hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-px active:scale-[0.97]';
  const cardPrimary = `${cardBase} rounded-2xl p-7 min-h-[140px] shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]`;
  const cardSecondary = `${cardBase} rounded-xl p-5 min-h-[100px] shadow-[0_1px_2px_0_rgba(0,0,0,0.04)]`;
  const cardCompact = `${cardBase} rounded-xl p-4 min-h-[72px] border-[var(--border-subtle)] shadow-none hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.06)]`;
  const cardDisabled = 'opacity-30 cursor-not-allowed hover:shadow-none hover:translate-y-0 active:scale-100';
  const sectionLabel = 'text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)] mb-3 pl-0.5';
  const backBtn = 'flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors mb-5';
  const pageTitle = 'text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-tight';

  return (
    <div className="fixed inset-0 bg-white flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-[var(--border-default)] px-5 py-3.5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard/events')}
            className="w-10 h-10 rounded-xl border border-[var(--border-default)] bg-white flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors">
            <BackArrow />
          </button>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--text-primary)] text-[15px] truncate">{event.name}</div>
            {event.location && <div className="text-[11px] text-[var(--text-tertiary)] truncate">{event.location}</div>}
          </div>
        </div>
        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <button onClick={() => setShowQR(true)}
            className="w-10 h-10 rounded-xl border border-[var(--border-default)] bg-white flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
            aria-label="Show QR code">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm14 3h.01M17 17h.01M14 14h3v3h-3v-3zm0 4h.01M17 20h.01M20 14h.01M20 17h.01M20 20h.01" />
            </svg>
          </button>
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

      {/* ── Task B: Mini Queue Strip ── */}
      {tenant && eventId && (
        <MiniQueueStrip
          tenantId={tenant.id}
          eventId={eventId}
          mode="event"
          onStartSale={handleQueueStartSale}
          isServingActive={!!activeQueueEntry}
        />
      )}

      {/* ── Task B: "Serving: [Name]" banner ── */}
      {activeQueueEntry && step === 'items' && (
        <div
          className="flex items-center justify-between px-4 shrink-0"
          style={{
            height: '38px',
            backgroundColor: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            borderBottom: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            />
            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
              Serving: {activeQueueEntry.name}
            </span>
          </div>
          <button
            onClick={cancelServing}
            className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/60 transition-colors shrink-0"
            aria-label="Cancel serving"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Main ── */}
      <div className="flex-1 flex overflow-hidden relative">

        <div className="flex-1 overflow-y-auto bg-[var(--surface-raised)]">
          <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-[var(--border-subtle)] text-xs">
            <span className="text-[var(--text-tertiary)]"><span className="font-semibold text-[var(--text-primary)]">{todaySales.count}</span> sales</span>
            <span className="text-[var(--text-tertiary)]">Revenue: <span className="font-bold text-[var(--text-primary)] font-mono">${todaySales.total.toFixed(2)}</span></span>
          </div>

          <div className="p-5 pb-28 md:pb-5 max-w-[720px] mx-auto">

            {/* ◆◆◆ ITEMS STEP — luxury step-down grid ◆◆◆ */}
            {step === 'items' && (
              <div>
                {selectionStep === 'category' && !showCustomForm && (
                  <div>
                    {primaryTypes.length > 0 && (
                      <div className="mb-4">
                        <div className={sectionLabel}>Services</div>
                        <div className="grid grid-cols-2 gap-3">
                          {primaryTypes.map((pt) => { const count = chainAvailCount(pt.id); return (
                            <button key={pt.id} onClick={() => count > 0 && selectCategory(pt)} disabled={count === 0}
                              className={`${cardPrimary} flex flex-col justify-between ${count === 0 ? cardDisabled : ''}`}>
                              <div><div className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight leading-tight">{pt.name}</div>
                              <div className="text-[12px] text-[var(--text-tertiary)] mt-1.5 font-medium">{pt.default_inches}&quot; standard</div></div>
                              <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] font-medium mt-4"><span>{count} chain{count !== 1 ? 's' : ''}</span><ChevronRight /></div>
                            </button>); })}
                        </div>
                      </div>
                    )}
                    {secondaryTypes.length > 0 && (
                      <div className="mb-4"><div className="grid grid-cols-3 gap-2.5">
                        {secondaryTypes.map((pt) => { const count = chainAvailCount(pt.id); return (
                          <button key={pt.id} onClick={() => count > 0 && selectCategory(pt)} disabled={count === 0}
                            className={`${cardSecondary} flex flex-col justify-between ${count === 0 ? cardDisabled : ''}`}>
                            <div className="text-[16px] font-semibold text-[var(--text-primary)]">{pt.name}</div>
                            <div className="text-[11px] text-[var(--text-tertiary)] mt-2 font-medium">{pt.default_inches}&quot; standard</div>
                          </button>); })}
                      </div></div>
                    )}
                    {(nonChainTypes.length > 0 || true) && (
                      <div><div className={sectionLabel}>Add-ons</div>
                      <div className="grid grid-cols-3 gap-2">
                        {nonChainTypes.map((type) => { const items = inventory.filter((i) => i.type === type && i.quantity_on_hand > 0); return (
                          <button key={type} onClick={() => { setSelectedNonChainType(type); setSelectedProductType(null); setSelectedMaterial(null); setShowCustomForm(false); setSelectionStep('chain'); }}
                            disabled={items.length === 0} className={`${cardCompact} flex flex-col justify-between ${items.length === 0 ? cardDisabled : ''}`}>
                            <div className="text-[14px] font-semibold text-[var(--text-secondary)]">{NON_CHAIN_LABELS[type] || type}</div>
                            <div className="text-[11px] text-[var(--text-tertiary)] mt-1">{items.length} items</div>
                          </button>); })}
                        <button onClick={() => { setShowCustomForm(true); setSelectedProductType(null); setSelectedMaterial(null); setSelectedNonChainType(null); }}
                          className="bg-white border border-dashed border-[var(--border-strong)] rounded-xl p-4 min-h-[72px] text-left cursor-pointer transition-all hover:border-[var(--text-tertiary)] flex flex-col justify-between">
                          <div className="text-[14px] font-semibold text-[var(--text-tertiary)]">Custom</div>
                          <div className="text-[11px] text-[var(--text-tertiary)] mt-1">Name your price</div>
                        </button>
                      </div></div>
                    )}
                  </div>
                )}

                {selectionStep === 'category' && showCustomForm && (
                  <div><button onClick={goHome} className={backBtn}><BackArrow /> Back</button>
                  <div className="max-w-sm mx-auto space-y-5 pt-8">
                    <h2 className={pageTitle + ' text-center'}>Custom Item</h2>
                    <input className="w-full h-14 px-4 rounded-xl border border-[var(--border-default)] bg-white text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] text-lg transition-all"
                      placeholder="Item name" value={customItem.name} onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })} autoFocus />
                    <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[var(--text-tertiary)] font-mono">$</span>
                    <input className="w-full h-14 pl-9 pr-4 rounded-xl border border-[var(--border-default)] bg-white text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] text-lg font-mono focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] transition-all"
                      type="number" step="0.01" min="0" placeholder="0.00" value={customItem.price} onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                      onKeyDown={(e) => { if (e.key === 'Enter') addCustomItem(); }} /></div>
                    <button onClick={addCustomItem} disabled={!customItem.name || !customItem.price} className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>Add to Cart</button>
                  </div></div>
                )}

                {selectionStep === 'material' && selectedProductType && (
                  <div><button onClick={goBack} className={backBtn}><BackArrow /> Back</button>
                  <div className="mb-6"><div className={sectionLabel}>Select Material</div><h2 className={pageTitle}>{selectedProductType.name}</h2></div>
                  {materialsForProductType.length === 0 ? (
                    <div className="text-center py-16"><p className="text-[var(--text-tertiary)] text-sm">No chains with pricing set for {selectedProductType.name}.</p></div>
                  ) : (<div className="grid grid-cols-2 gap-3">
                    {materialsForProductType.map(([material, count]) => (
                      <button key={material} onClick={() => selectMaterial(material)} className={`${cardPrimary} flex flex-col justify-between`}>
                        <div className="text-[18px] font-semibold text-[var(--text-primary)]">{material}</div>
                        <div className="flex items-center justify-between mt-3"><span className="text-[12px] text-[var(--text-tertiary)] font-medium">{count} chain{count !== 1 ? 's' : ''}</span><ChevronRight /></div>
                      </button>))}
                  </div>)}</div>
                )}

                {selectionStep === 'chain' && selectedProductType && selectedMaterial && (
                  <div><button onClick={goBack} className={backBtn}><BackArrow /> Back</button>
                  <div className="mb-6"><div className={sectionLabel}>{selectedProductType.name} / {selectedMaterial}</div><h2 className={pageTitle}>Select Chain</h2></div>
                  <div className="grid grid-cols-2 gap-3">
                    {chainsForMaterial.map((chain) => (
                      <button key={chain.id} onClick={() => selectChain(chain)} className={`${cardSecondary} flex flex-col justify-between`}>
                        <div><div className="text-[15px] font-semibold text-[var(--text-primary)]">{chain.name}</div>
                        <div className="text-[12px] text-[var(--text-tertiary)] mt-1">{chain.quantity_on_hand.toFixed(0)} {chain.unit} in stock</div></div>
                        <div className="text-[20px] font-bold text-[var(--text-primary)] font-mono mt-3 tracking-tight">{getChainPrice(chain)}</div>
                      </button>))}
                  </div></div>
                )}

                {selectionStep === 'chain' && selectedNonChainType && (
                  <div><button onClick={goHome} className={backBtn}><BackArrow /> Back</button>
                  <div className="mb-6"><div className={sectionLabel}>{NON_CHAIN_LABELS[selectedNonChainType] || selectedNonChainType}</div></div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {nonChainItems.map((item) => (
                      <button key={item.id} onClick={() => addNonChainItem(item)} className={`${cardSecondary} flex flex-col justify-between`}>
                        <div><div className="text-[15px] font-semibold text-[var(--text-primary)]">{item.name}</div>
                        <div className="text-[12px] text-[var(--text-tertiary)] mt-1">{item.material && `${item.material} — `}{item.quantity_on_hand} left</div></div>
                        <div className="text-[20px] font-bold text-[var(--text-primary)] font-mono mt-3 tracking-tight">${Number(item.sell_price).toFixed(2)}</div>
                      </button>))}
                  </div></div>
                )}

                {selectionStep === 'measure' && selectedChain && selectedProductType && (
                  <div><button onClick={goBack} className={backBtn}><BackArrow /> Back</button>
                  <div className="max-w-sm mx-auto pt-8 space-y-8">
                    <div className="text-center"><div className={sectionLabel + ' text-center'}>{selectedChain.name} / {selectedProductType.name}</div>
                    <div className="text-sm text-[var(--text-tertiary)]">${Number(selectedChain.sell_price).toFixed(2)}/in</div></div>
                    <div><label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2.5 text-center">Measured Inches</label>
                    <input type="number" step="0.25" min="0.25" value={measureInches} onChange={(e) => setMeasureInches(e.target.value)}
                      className="w-full h-20 px-4 rounded-2xl border border-[var(--border-default)] bg-white text-[var(--text-primary)] text-center text-[40px] font-mono font-semibold focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] transition-all tracking-tight"
                      autoFocus onKeyDown={(e) => { if (e.key === 'Enter') addMeasuredChain(); }} /></div>
                    {measureInches && Number(measureInches) > 0 && (<div className="text-center">
                      <div className="text-[11px] uppercase tracking-[0.06em] text-[var(--text-tertiary)] font-semibold mb-2">Calculated Price</div>
                      <div className="text-[48px] font-bold text-[var(--text-primary)] font-mono tracking-tighter leading-none">${(Number(measureInches) * Number(selectedChain.sell_price)).toFixed(2)}</div>
                    </div>)}
                    <button onClick={addMeasuredChain} disabled={!measureInches || Number(measureInches) <= 0}
                      className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>Add to Cart</button>
                  </div></div>
                )}
              </div>
            )}

            {/* ◆◆◆ TIP / PAYMENT (Task A: receipt step removed — payment goes straight to completeSale) ◆◆◆ */}
            {step === 'tip' && (
              <div className="max-w-sm mx-auto py-8 space-y-6">
                <h2 className={pageTitle + ' text-center'}>Add a Tip</h2>
                <p className="text-[var(--text-tertiary)] text-center text-sm">Subtotal: <span className="font-mono font-medium">${(cart.subtotal + cart.tax_amount).toFixed(2)}</span></p>
                <div className="grid grid-cols-3 gap-3">
                  {TIP_PRESETS.map((a) => (<button key={a} onClick={() => cart.setTip(a)} className={`py-5 rounded-2xl text-xl font-bold transition-all min-h-[56px] ${cart.tip_amount === a ? 'bg-[var(--text-primary)] text-white shadow-md' : 'bg-white border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:shadow-sm'}`}>{a === 0 ? 'None' : `$${a}`}</button>))}
                </div>
                <div><label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">Custom tip</label>
                <input type="number" step="0.01" min="0" className="w-full h-14 px-4 rounded-xl border border-[var(--border-default)] bg-white text-[var(--text-primary)] text-center text-xl font-mono focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] transition-all" placeholder="$0.00" value={cart.tip_amount || ''} onChange={(e) => cart.setTip(Number(e.target.value) || 0)} /></div>
                <button onClick={() => setStep('payment')} className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>Continue to Payment</button>
              </div>
            )}

            {step === 'payment' && (
              <div className="max-w-sm mx-auto py-8 space-y-6">
                <h2 className={pageTitle + ' text-center'}>Select Payment</h2>
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((pm) => (<button key={pm.value} onClick={() => cart.setPaymentMethod(pm.value)} className={`py-7 rounded-2xl text-center transition-all min-h-[80px] ${cart.payment_method === pm.value ? 'bg-[var(--text-primary)] text-white shadow-md' : 'bg-white border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:shadow-sm'}`}><div className="text-lg font-bold">{pm.label}</div></button>))}
                </div>
                {/* Task A: Payment now goes directly to completeSale (no more receipt step) */}
                {cart.payment_method && (
                  <button onClick={handleCompleteSale} disabled={processing}
                    className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm disabled:opacity-60"
                    style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
                    {processing ? 'Processing...' : `Complete Sale — $${cart.total.toFixed(2)}`}
                  </button>
                )}
              </div>
            )}

            {/* ◆◆◆ CONFIRMATION STEP ◆◆◆ */}
            {step === 'confirmation' && completedSale && (
              <div className="max-w-md mx-auto py-8 space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 mb-2">
                    <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h2 className={pageTitle}>Sale Complete</h2>
                  <p className="text-[var(--text-tertiary)] text-sm">{paymentLabels[completedSale.paymentMethod] || completedSale.paymentMethod}</p>
                </div>

                {/* Receipt summary */}
                <div className="bg-white border border-[var(--border-default)] rounded-2xl p-5 space-y-3 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)]">
                  <div className="space-y-2">
                    {completedSale.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm"><span className="text-[var(--text-primary)] font-medium">{item.name}{item.quantity > 1 ? ` x${item.quantity}` : ''}</span><span className="text-[var(--text-secondary)] font-mono">${item.lineTotal.toFixed(2)}</span></div>
                    ))}
                  </div>
                  <div className="border-t border-[var(--border-subtle)] pt-2 space-y-1">
                    <div className="flex justify-between text-sm text-[var(--text-tertiary)]"><span>Subtotal</span><span className="font-mono">${completedSale.subtotal.toFixed(2)}</span></div>
                    {completedSale.taxAmount > 0 && <div className="flex justify-between text-sm text-[var(--text-tertiary)]"><span>Tax ({(completedSale.taxRate * 100).toFixed(1)}%)</span><span className="font-mono">${completedSale.taxAmount.toFixed(2)}</span></div>}
                    {completedSale.tipAmount > 0 && <div className="flex justify-between text-sm text-[var(--text-tertiary)]"><span>Tip</span><span className="font-mono">${completedSale.tipAmount.toFixed(2)}</span></div>}
                  </div>
                  <div className="border-t-2 border-[var(--text-primary)] pt-4 flex items-baseline justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Total</span>
                    <span className="text-[28px] font-bold text-[var(--text-primary)] font-mono tracking-tight leading-none">${completedSale.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Receipt sending — always show editable inputs + send buttons */}
                {(receiptConfig.email || receiptConfig.sms) && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Send Receipt</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {receiptConfig.email && (
                        <div className="bg-white border border-[var(--border-default)] rounded-xl p-3 space-y-2">
                          <input className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] text-sm transition-all"
                            type="email" value={receiptEmail} onChange={(e) => setReceiptEmail(e.target.value)} placeholder="customer@email.com" />
                          {emailSent ? (<div className="flex items-center gap-1.5 text-green-600 text-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Sent</div>) : (
                            <Button variant="secondary" size="sm" onClick={sendEmailReceipt} loading={sendingEmail} disabled={!receiptEmail} className="w-full min-h-[44px]">{sendingEmail ? 'Sending...' : 'Email Receipt'}</Button>
                          )}{emailError && <p className="text-xs text-red-500">{emailError}</p>}
                        </div>
                      )}
                      {receiptConfig.sms && (
                        <div className="bg-white border border-[var(--border-default)] rounded-xl p-3 space-y-2">
                          <input className="w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-white text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] text-sm transition-all"
                            type="tel" value={receiptPhone} onChange={(e) => setReceiptPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
                          {smsSent ? (<div className="flex items-center gap-1.5 text-green-600 text-sm"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Sent</div>) : (
                            <Button variant="secondary" size="sm" onClick={sendSMSReceipt} loading={sendingSMS} disabled={!receiptPhone} className="w-full min-h-[44px]">{sendingSMS ? 'Sending...' : 'Text Receipt'}</Button>
                          )}{smsError && <p className="text-xs text-red-500">{smsError}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <button onClick={startNewSale} className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>New Sale</button>
              </div>
            )}
          </div>
        </div>

        {/* Desktop Cart Sidebar */}
        {step !== 'confirmation' && (
          <div className="hidden md:flex w-80 lg:w-[380px] bg-white border-l border-[var(--border-default)] flex-col shrink-0">
            <CartPanel cart={cart} step={step} setStep={setStep} tenant={tenant} />
          </div>
        )}

        {/* Mobile Cart Sheet */}
        {showCart && step !== 'confirmation' && (
          <div className="md:hidden fixed inset-0 z-40 flex flex-col">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCart(false)} />
            <div className="relative mt-auto bg-white rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Cart — {cart.items.length} item{cart.items.length !== 1 ? 's' : ''}</span>
                <button onClick={() => setShowCart(false)} className="p-2 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--text-tertiary)] min-h-[44px] min-w-[44px] flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="overflow-y-auto flex-1"><CartPanel cart={cart} step={step} setStep={setStep} tenant={tenant} /></div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Cart Button */}
      {cart.items.length > 0 && !showCart && step !== 'confirmation' && (
        <div className="md:hidden fixed bottom-4 left-4 right-4 z-30">
          <button onClick={() => setShowCart(true)} className="w-full flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg transition-all active:scale-[0.98]" style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}>
            <span className="flex items-center gap-2"><span className="bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">{cart.items.length}</span><span className="font-semibold">View Cart</span></span>
            <span className="font-bold font-mono text-lg">${cart.total.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* QR Modal */}
      {showQR && event && tenant && !showFullScreenQR && (
        <Modal isOpen={true} onClose={() => setShowQR(false)} size="lg">
          <ModalHeader><h2 className="text-xl font-semibold text-[var(--text-primary)]">Event QR Code</h2><p className="text-sm text-[var(--text-tertiary)] mt-1">Customers scan to sign waiver and join queue.</p></ModalHeader>
          <ModalBody className="flex flex-col items-center py-6"><QRCode url={generateQRData(tenant.slug, event.id)} size={280} tenantName={tenant.name} eventName={event.name} showDownload showPrint /></ModalBody>
          <ModalFooter><Button variant="ghost" size="sm" onClick={() => setShowFullScreenQR(true)}>Full Screen</Button><Button variant="secondary" onClick={() => setShowQR(false)}>Close</Button></ModalFooter>
        </Modal>
      )}
      {showFullScreenQR && event && tenant && (<FullScreenQR url={generateQRData(tenant.slug, event.id)} tenantName={tenant.name} eventName={event.name} onClose={() => setShowFullScreenQR(false)} />)}

      {/* Jump Ring Picker Modal */}
      <JumpRingPickerModal
        open={showJumpRingPicker}
        onClose={() => setShowJumpRingPicker(false)}
        onConfirm={handleJumpRingPickerConfirm}
        unresolvedResolutions={jumpRingResolutions.filter((r) => !r.resolved)}
        jumpRingInventory={jumpRingInventory}
        lowStockWarnings={pendingJumpRingLowStockWarnings}
      />
    </div>
  );
}

// ============================================================================
// Suspense Wrapper (Task A — Next.js 15 requires this for useSearchParams)
// ============================================================================

export default function EventModePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--text-primary)] border-t-transparent" />
      </div>
    }>
      <EventModePageInner />
    </Suspense>
  );
}