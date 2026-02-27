// ============================================================================
// Store Mode POS — src/app/dashboard/pos/page.tsx
// ============================================================================
// Material-first product selection with auto-detected Quick-Tap / Progressive
// Filter modes. Shared components live in src/components/pos/.
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
import { ProductSelector, QueueBadge } from '@/components/pos';
import type {
  InventoryItem,
  TaxProfile,
  PaymentMethod,
  ProductType,
  ChainProductPrice,
} from '@/types';

interface CompletedSaleData {
  saleId: string;
  saleDate: string;
  items: { name: string; quantity: number; unit_price: number; line_total: number }[];
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  tipAmount: number;
  total: number;
  paymentMethod: string;
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'card_present', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'venmo', label: 'Venmo' },
  { value: 'other', label: 'Other' },
];

const TIP_PRESETS = [0, 3, 5, 10, 15, 20];

type CheckoutStep = 'items' | 'tip' | 'payment' | 'confirmation';

// SVG icon for back button (still used in header)
const BackArrow = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
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

  // QR code state
  const [showQR, setShowQR] = useState(false);
  const [showFullScreenQR, setShowFullScreenQR] = useState(false);

  // Queue/check-in state
  const [activeQueueEntry, setActiveQueueEntry] = useState<any | null>(null);
  const [queueRefresh, setQueueRefresh] = useState(0);

  // Receipt / confirmation
  const [completedSale, setCompletedSale] = useState<CompletedSaleData | null>(null);
  const [receiptConfig, setReceiptConfig] = useState<{ email: boolean; sms: boolean }>({ email: false, sms: false });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingSMS, setSendingSMS] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [smsError, setSmsError] = useState('');

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

  // ── Check receipt config ────────────────────────────────────────────────

  useEffect(() => {
    fetch('/api/receipts/config')
      .then((r) => r.json())
      .then((cfg) => setReceiptConfig(cfg))
      .catch(() => {});
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────

  const chains = useMemo(() => inventory.filter((i) => i.type === 'chain'), [inventory]);

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

  // ── Receipt sending ───────────────────────────────────────────────────

  const sendEmailReceipt = async () => {
    if (!receiptEmail || !completedSale || !tenant) return;
    setSendingEmail(true); setEmailError('');
    try {
      const res = await fetch('/api/receipts/email', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: receiptEmail, tenantName: tenant.name, tenantAccentColor: tenant.brand_color || undefined,
          saleDate: completedSale.saleDate, items: completedSale.items,
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
          total: completedSale.total, itemCount: completedSale.items.reduce((s: number, i: any) => s + i.quantity, 0),
          paymentMethod: completedSale.paymentMethod }) });
      const data = await res.json();
      if (data.sent) { setSmsSent(true); if (completedSale.saleId) await supabase.from('sales').update({ receipt_sent_at: new Date().toISOString() }).eq('id', completedSale.saleId); }
      else setSmsError(data.error || "Couldn't send text.");
    } catch { setSmsError("Couldn't send text."); }
    finally { setSendingSMS(false); }
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

      // Save completed sale data for confirmation screen
      const paymentLabels: Record<string, string> = { card_present: 'Card', cash: 'Cash', venmo: 'Venmo', other: 'Other' };
      const saleData: CompletedSaleData = {
        saleId: sale.id,
        saleDate: new Date().toISOString(),
        items: cart.items.map((item: any) => ({
          name: item.name, quantity: item.quantity, unit_price: item.unit_price, line_total: item.line_total,
        })),
        subtotal: cart.subtotal,
        taxAmount: cart.tax_amount,
        taxRate: taxProfile ? Number(taxProfile.rate) : 0,
        tipAmount: cart.tip_amount,
        total: cart.total,
        paymentMethod: paymentLabels[cart.payment_method || ''] || cart.payment_method || 'Unknown',
      };

      setTodaySales((p) => ({ count: p.count + 1, total: p.total + Number(sale.total) }));
      setCompletedSale(saleData);
      cart.reset(); setStep('confirmation'); setShowCart(false);
      setEmailSent(false); setSmsSent(false); setEmailError(''); setSmsError('');
      setQueueRefresh((n) => n + 1);
      toast.success('Sale completed');

      // Refresh inventory
      const { data: refreshed } = await supabase.from('inventory_items').select('*').eq('tenant_id', tenant.id).eq('is_active', true).order('type').order('name');
      if (refreshed) setInventory(refreshed as InventoryItem[]);
    } catch (err: any) { toast.error(err?.message || 'Sale failed'); }
    finally { setProcessing(false); }
  };

  // ── Loading ────────────────────────────────────────────────────────────

  if (!tenant) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--surface-base)]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-[var(--text-primary)] border-t-transparent mb-4" />
          <p className="text-[var(--text-tertiary)] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // ── QR data ────────────────────────────────────────────────────────────

  const qrUrl = generateQRData(tenant.slug);

  const pageTitle = 'text-[24px] font-bold text-[var(--text-primary)] tracking-tight leading-tight';

  return (
    <div className="fixed inset-0 bg-[var(--surface-base)] flex flex-col">

      {/* ── Header ── */}
      <header className="bg-[var(--surface-base)] border-b border-[var(--border-default)] px-5 py-3.5 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard')}
            className="w-10 h-10 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors">
            <BackArrow />
          </button>
          <div className="min-w-0">
            <div className="font-semibold text-[var(--text-primary)] text-[15px]">{tenant.name}</div>
            <div className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-[0.05em] font-medium">Store Mode</div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Queue Badge */}
          <QueueBadge
            tenantId={tenant.id}
            mode="store"
            onStartSale={handleQueueStartSale}
            isServingActive={!!activeQueueEntry}
            refreshTrigger={queueRefresh}
          />

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
              <div className="text-lg font-bold text-[var(--text-primary)] ">${todaySales.total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </header>

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
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--surface-subtle)] text-[var(--text-tertiary)]"
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
          <div className="sm:hidden flex items-center justify-between px-4 py-2 bg-[var(--surface-base)] border-b border-[var(--border-subtle)] text-xs">
            <span className="text-[var(--text-tertiary)]"><span className="font-semibold text-[var(--text-primary)]">{todaySales.count}</span> sales today</span>
            <span className="text-[var(--text-tertiary)]">Revenue: <span className="font-bold text-[var(--text-primary)] ">${todaySales.total.toFixed(2)}</span></span>
          </div>

          <div className="p-5 pb-28 md:pb-5 max-w-[720px] mx-auto">

            {/* ═══ ITEMS STEP — Material-first ProductSelector ═══ */}
            {step === 'items' && (
              <ProductSelector
                chains={chains}
                inventory={inventory}
                productTypes={productTypes}
                chainPrices={chainPrices}
                mode="store"
                onAddToCart={(item) => {
                  cart.addItem(item);
                  toast.success(`Added ${item.name}`);
                }}
              />
            )}

            {/* ═══ TIP / PAYMENT / RECEIPT STEPS ═══ */}
            {step === 'tip' && (
              <div className="max-w-sm mx-auto py-8 space-y-6">
                <h2 className={pageTitle + ' text-center'}>Add a Tip</h2>
                <p className="text-[var(--text-tertiary)] text-center text-sm">Subtotal: <span className=" font-medium">${(cart.subtotal + cart.tax_amount).toFixed(2)}</span></p>
                <div className="grid grid-cols-3 gap-3">
                  {TIP_PRESETS.map((amount) => (
                    <button key={amount} onClick={() => cart.setTip(amount)}
                      className={`py-5 rounded-2xl text-xl font-bold transition-all min-h-[56px] ${
                        cart.tip_amount === amount
                          ? 'bg-[var(--text-primary)] text-[var(--surface-base)] shadow-md' : 'bg-[var(--surface-raised)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:shadow-sm'
                      }`}>{amount === 0 ? 'None' : `$${amount}`}</button>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)] mb-2">Custom tip</label>
                  <input type="number" step="0.01" min="0" className="w-full h-14 px-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] text-center text-xl  focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] transition-all"
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
                          ? 'bg-[var(--text-primary)] text-[var(--surface-base)] shadow-md' : 'bg-[var(--surface-raised)] border border-[var(--border-default)] text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:shadow-sm'
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

            {/* ═══ CONFIRMATION STEP ═══ */}
            {step === 'confirmation' && completedSale && (
              <div className="max-w-md mx-auto py-8 space-y-6">
                {/* Success header */}
                <div className="text-center space-y-3">
                  <div className="mx-auto w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--accent-primary) 12%, white)' }}>
                    <svg className="w-7 h-7" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h2 className={pageTitle}>Sale Complete</h2>
                  <div className="text-[36px] font-bold text-[var(--text-primary)]  tracking-tight leading-none">
                    ${completedSale.total.toFixed(2)}
                  </div>
                  <p className="text-sm text-[var(--text-tertiary)]">{completedSale.paymentMethod} — {completedSale.items.length} item{completedSale.items.length !== 1 ? 's' : ''}</p>
                </div>

                {/* Receipt sending */}
                {(receiptConfig.email || receiptConfig.sms) && (
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">Send Receipt</p>

                    {/* Email receipt */}
                    {receiptConfig.email && (
                      <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                          </svg>
                          <input
                            className="flex-1 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] text-sm transition-all"
                            type="email" value={receiptEmail} onChange={(e) => setReceiptEmail(e.target.value)}
                            placeholder="customer@email.com"
                          />
                        </div>
                        {emailSent ? (
                          <div className="flex items-center gap-1.5 text-success-600 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            Sent
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={sendEmailReceipt} disabled={!receiptEmail || sendingEmail} className="w-full min-h-[44px]">
                            {sendingEmail ? 'Sending...' : 'Send Email Receipt'}
                          </Button>
                        )}
                        {emailError && <p className="text-xs text-error-500">{emailError}</p>}
                      </div>
                    )}

                    {/* SMS receipt */}
                    {receiptConfig.sms && (
                      <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
                          </svg>
                          <input
                            className="flex-1 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--border-strong)] focus:ring-[3px] focus:ring-[rgba(0,0,0,0.04)] text-sm transition-all"
                            type="tel" value={receiptPhone} onChange={(e) => setReceiptPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000"
                          />
                        </div>
                        {smsSent ? (
                          <div className="flex items-center gap-1.5 text-success-600 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            Sent
                          </div>
                        ) : (
                          <Button variant="secondary" size="sm" onClick={sendSMSReceipt} disabled={!receiptPhone || sendingSMS} className="w-full min-h-[44px]">
                            {sendingSMS ? 'Sending...' : 'Send Text Receipt'}
                          </Button>
                        )}
                        {smsError && <p className="text-xs text-error-500">{smsError}</p>}
                      </div>
                    )}
                  </div>
                )}

                {/* New Sale button */}
                <button
                  onClick={() => {
                    setStep('items'); setCompletedSale(null);
                    setReceiptEmail(''); setReceiptPhone('');
                    setEmailSent(false); setSmsSent(false);
                    setEmailError(''); setSmsError('');
                    setQueueRefresh((n) => n + 1);
                  }}
                  className="w-full h-14 rounded-xl font-semibold text-base transition-all active:scale-[0.97] shadow-sm"
                  style={{ backgroundColor: 'var(--accent-primary)', color: 'white' }}
                >
                  New Sale
                </button>
              </div>
            )}


          </div>
        </div>

        {/* Desktop Cart Sidebar */}
        <div className="hidden md:flex w-80 lg:w-[380px] bg-[var(--surface-raised)] border-l border-[var(--border-default)] flex-col shrink-0">
          <CartPanel cart={cart} step={step} setStep={setStep} tenant={tenant} />
        </div>

        {/* Mobile Cart Sheet */}
        {showCart && (
          <div className="md:hidden fixed inset-0 z-40 flex flex-col">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowCart(false)} />
            <div className="relative mt-auto bg-[var(--surface-raised)] rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl">
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
            <span className="font-bold  text-lg">${cart.total.toFixed(2)}</span>
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
            <p className="text-xs text-[var(--text-tertiary)] mt-4 text-center  break-all">
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