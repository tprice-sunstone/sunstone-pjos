// ============================================================================
// Reorder Modal — src/components/inventory/ReorderModal.tsx
// ============================================================================
// Multi-step modal for reordering supplies from Sunstone:
// 1. Cart Review (product, variant, quantity, shipping, totals)
// 2. Payment (saved card selection or new card entry via SF/Authorize.net)
// 3. Processing (SF Opp + Quote → charge card → finalize)
// 4. Confirmation (order summary, SF reference)
// ============================================================================

'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import type { InventoryItem } from '@/types';
import type { SunstoneProduct } from '@/lib/shopify';

// ── Types ─────────────────────────────────────────────────────────────────

interface ReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem;
  onReorderCreated?: () => void;
}

type CheckoutStep = 'review' | 'payment' | 'processing' | 'confirmation';

interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expirationMonth: number;
  expirationYear: number;
}

interface SfResult {
  opportunityId: string;
  quoteId: string;
  opportunityName: string;
  tax: number;
  shipping: number;
  grandTotal: number;
}

// ── Main Component ────────────────────────────────────────────────────────

export default function ReorderModal({ isOpen, onClose, item, onReorderCreated }: ReorderModalProps) {
  const { tenant } = useTenant();
  const supabase = createClient();

  // Product
  const [product, setProduct] = useState<SunstoneProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [needsResync, setNeedsResync] = useState(false);
  const [resyncing, setResyncing] = useState(false);

  // Checkout flow
  const [step, setStep] = useState<CheckoutStep>('review');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    street: '', city: '', state: '', postalCode: '', country: 'US',
  });
  const [loadingAccount, setLoadingAccount] = useState(false);

  // SF Account
  const [sfAccountId, setSfAccountId] = useState<string | null>(null);
  const [sfContactId, setSfContactId] = useState<string | null>(null);
  const [sfAccountMatched, setSfAccountMatched] = useState<boolean | null>(null);

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showNewCardForm, setShowNewCardForm] = useState(false);

  // New card form
  const [newCard, setNewCard] = useState({
    nameOnCard: '', cardNumber: '', expirationMonth: '', expirationYear: '', cvv: '',
  });

  // Reorder
  const [reorderId, setReorderId] = useState<string | null>(null);
  const [creatingReorder, setCreatingReorder] = useState(false);
  const [totals, setTotals] = useState({ subtotal: 0, tax: 0, shipping: 0, total: 0 });

  // SF result
  const [sfResult, setSfResult] = useState<SfResult | null>(null);
  const [processingMsg, setProcessingMsg] = useState('');
  const [chargedCard, setChargedCard] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // ── Load product from catalog cache ──────────────────────────────────

  useEffect(() => {
    if (!isOpen || !item.sunstone_product_id) return;

    const loadProduct = async () => {
      setLoading(true);
      setStep('review');
      setSfResult(null);
      setNeedsResync(false);
      setPaymentError(null);
      try {
        const { data: cache } = await supabase
          .from('sunstone_catalog_cache')
          .select('products')
          .limit(1)
          .single();

        if (cache?.products) {
          const products = cache.products as SunstoneProduct[];
          const match = products.find((p) => p.id === item.sunstone_product_id);
          if (match) {
            const hasVariantIds = match.variants.some((v) => !!v.id);
            if (!hasVariantIds && match.variants.length > 0) {
              setNeedsResync(true);
              setProduct(null);
            } else {
              setProduct(match);
              setSelectedVariantIdx(0);
              suggestQuantity(match);
            }
          } else {
            setProduct(null);
          }
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, item.sunstone_product_id]);

  // ── Load SF account + shipping address + payment methods ─────────────

  useEffect(() => {
    if (!isOpen) return;
    const loadAccount = async () => {
      setLoadingAccount(true);
      try {
        const res = await fetch('/api/salesforce/match-account');
        if (res.ok) {
          const data = await res.json();
          if (data.matched) {
            setSfAccountMatched(true);
            setSfAccountId(data.accountId);
            setSfContactId(data.contactId || null);
            if (data.shippingAddress) {
              setShippingAddress(data.shippingAddress);
            }
            if (data.paymentMethods?.length > 0) {
              setPaymentMethods(data.paymentMethods);
              setSelectedCardId(data.paymentMethods[0].id);
            }
          } else {
            setSfAccountMatched(false);
          }
        }
      } catch { /* non-critical */ }
      setLoadingAccount(false);
    };
    loadAccount();
  }, [isOpen]);

  // ── Smart quantity suggestion ────────────────────────────────────────

  const suggestQuantity = async (p: SunstoneProduct) => {
    if (!tenant) return;
    try {
      const { data: lastReorder } = await supabase
        .from('reorder_history')
        .select('items')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (lastReorder?.items) {
        const items = lastReorder.items as any[];
        const prev = items.find((i) => i.inventory_item_id === item.id);
        if (prev?.quantity) {
          setQuantity(prev.quantity);
          return;
        }
      }
      setQuantity(1);
    } catch {
      setQuantity(1);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────

  const selectedVariant = product?.variants?.[selectedVariantIdx];
  const unitPrice = selectedVariant ? parseFloat(selectedVariant.price) : 0;
  const estimatedSubtotal = unitPrice * quantity;

  const handleResync = async () => {
    setResyncing(true);
    try {
      const res = await fetch('/api/shopify/sync?force=true');
      if (res.ok) {
        toast.success('Catalog synced — reloading product...');
        setNeedsResync(false);
        setLoading(true);
        const { data: cache } = await supabase
          .from('sunstone_catalog_cache')
          .select('products')
          .limit(1)
          .single();
        if (cache?.products) {
          const products = cache.products as SunstoneProduct[];
          const match = products.find((p) => p.id === item.sunstone_product_id);
          if (match && match.variants.some((v) => !!v.id)) {
            setProduct(match);
            setSelectedVariantIdx(0);
            suggestQuantity(match);
          } else {
            setProduct(null);
            toast.error('Product still missing variant data after sync.');
          }
        }
        setLoading(false);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Catalog sync failed');
      }
    } catch {
      toast.error('Catalog sync failed');
    } finally {
      setResyncing(false);
    }
  };

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  // ── Step 1 → 2: Create reorder record and go to payment ─────────────

  const handleContinueToPayment = async () => {
    if (!product || !selectedVariant) return;

    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.state || !shippingAddress.postalCode) {
      toast.error('Please fill in your shipping address.');
      return;
    }

    if (sfAccountMatched === false) {
      toast.error('No Sunstone account found. Contact us at 385-999-5240.');
      return;
    }

    setCreatingReorder(true);
    try {
      const variantLabel = selectedVariant.title !== 'Default Title' ? ` — ${selectedVariant.title}` : '';

      // Create the reorder_history record
      const { data: reorder, error: reorderError } = await supabase
        .from('reorder_history')
        .insert({
          tenant_id: tenant!.id,
          status: 'pending_payment',
          items: [{
            inventory_item_id: item.id,
            variant_id: selectedVariant.id || selectedVariant.sku || '',
            name: `${product.title}${variantLabel}`,
            quantity,
            unit_price: unitPrice,
          }],
          total_amount: estimatedSubtotal,
          tax_amount: 0,
          shipping_amount: 0,
          notes: `Shipping to: ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}`,
          ordered_by: null,
        })
        .select('id')
        .single();

      if (reorderError || !reorder) {
        toast.error('Failed to create order record');
        return;
      }

      setReorderId(reorder.id);
      setTotals({ subtotal: estimatedSubtotal, tax: 0, shipping: 0, total: estimatedSubtotal });
      setStep('payment');
    } catch {
      toast.error('Failed to prepare order');
    } finally {
      setCreatingReorder(false);
    }
  };

  // ── Step 2 → 3: Process payment ─────────────────────────────────────

  const handlePay = useCallback(async (cardIdToCharge: string, cardLabel: string) => {
    if (!reorderId) return;

    setStep('processing');
    setProcessingMsg('Creating your order...');
    setPaymentError(null);

    try {
      // Step 1: Create SF Opportunity + Quote
      const sfRes = await fetch('/api/salesforce/create-reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderId, contactId: sfContactId }),
      });

      const sfData = await sfRes.json();

      if (!sfData.success) {
        setPaymentError(sfData.error || sfData.sfError || 'Failed to create Salesforce order.');
        setStep('payment');
        return;
      }

      setSfResult({
        opportunityId: sfData.opportunityId || '',
        quoteId: sfData.quoteId || '',
        opportunityName: sfData.opportunityName || '',
        tax: sfData.tax || 0,
        shipping: sfData.shipping || 0,
        grandTotal: sfData.grandTotal || totals.total,
      });

      const chargeAmount = sfData.grandTotal || totals.total;

      // Step 2: Charge the card via SF/Authorize.net
      setProcessingMsg('Charging your card...');

      const chargeRes = await fetch('/api/reorders/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reorderHistoryId: reorderId,
          cardId: cardIdToCharge,
          amount: chargeAmount,
        }),
      });

      const chargeData = await chargeRes.json();

      if (!chargeData.success) {
        // Payment failed but Opp exists — show error with manual resolution path
        setPaymentError(
          `Payment failed: ${chargeData.error || 'Unknown error'}. Your order has been submitted — contact Sunstone at 385-999-5240 to complete payment.`
        );
        setChargedCard(null);
        setStep('confirmation');
        onReorderCreated?.();
        return;
      }

      // Step 3: Finalize — move Opp to Closed Won
      setProcessingMsg('Finalizing order...');

      await fetch('/api/salesforce/create-reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reorderId }),
      });

      setProcessingMsg('Order confirmed!');
      setChargedCard(cardLabel);
      await new Promise((r) => setTimeout(r, 600));
      setStep('confirmation');
      onReorderCreated?.();
      toast.success('Order confirmed!');
    } catch (err: any) {
      setPaymentError(err.message || 'An unexpected error occurred.');
      setStep('payment');
    }
  }, [reorderId, sfContactId, totals.total, onReorderCreated]);

  // ── Add new card and pay ─────────────────────────────────────────────

  const handleAddCardAndPay = async () => {
    if (!sfAccountId || !reorderId) return;

    const { nameOnCard, cardNumber, expirationMonth, expirationYear, cvv } = newCard;
    const cleanNumber = cardNumber.replace(/\s/g, '');

    if (!nameOnCard || cleanNumber.length < 13 || !expirationMonth || !expirationYear || cvv.length < 3) {
      toast.error('Please fill in all card fields.');
      return;
    }

    setStep('processing');
    setProcessingMsg('Saving your card...');
    setPaymentError(null);

    try {
      const addRes = await fetch('/api/salesforce/add-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: sfAccountId,
          nameOnCard,
          cardNumber: cleanNumber,
          expirationMonth: parseInt(expirationMonth),
          expirationYear: parseInt(expirationYear),
          cvv,
        }),
      });

      const addData = await addRes.json();

      if (!addData.success) {
        setPaymentError(addData.error || 'Failed to save card.');
        setStep('payment');
        return;
      }

      const last4 = cleanNumber.slice(-4);
      const label = `${addData.brand || 'Card'} ending in ${addData.last4 || last4}`;

      // Now charge the newly added card
      await handlePay(addData.cardId, label);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to save card.');
      setStep('payment');
    }
  };

  // ── Close / reset ────────────────────────────────────────────────────

  const handleClose = () => {
    setStep('review');
    setProduct(null);
    setNeedsResync(false);
    setLoading(true);
    setReorderId(null);
    setSfResult(null);
    setProcessingMsg('');
    setPaymentError(null);
    setChargedCard(null);
    setShowNewCardForm(false);
    setNewCard({ nameOnCard: '', cardNumber: '', expirationMonth: '', expirationYear: '', cvv: '' });
    onClose();
  };

  // ── Render ───────────────────────────────────────────────────────────

  const currentYear = new Date().getFullYear();

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="md">
      <ModalHeader>
        <h2 className="text-lg font-bold text-[var(--text-primary)] font-display">
          {step === 'review' && 'Reorder from Sunstone'}
          {step === 'payment' && 'Payment'}
          {step === 'processing' && 'Processing...'}
          {step === 'confirmation' && (paymentError && !chargedCard ? 'Order Submitted' : 'Order Confirmed')}
        </h2>
        {step === 'review' && (
          <p className="text-sm text-[var(--text-secondary)] mt-1">{item.name}</p>
        )}
      </ModalHeader>

      <ModalBody className="space-y-5">
        {/* ── Loading state ─────────────────────────────────────────── */}
        {loading && step === 'review' ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[var(--text-tertiary)] mt-3">Loading product...</p>
          </div>

        ) : !product && step === 'review' ? (
          /* ── No product / needs resync ────────────────────────────── */
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              {needsResync
                ? 'The Shopify catalog needs to be re-synced to include product variant data.'
                : 'Product not found in catalog. The catalog may need to be synced.'}
            </p>
            <Button variant="secondary" size="sm" onClick={handleResync} loading={resyncing}>
              {resyncing ? 'Syncing...' : 'Re-sync Catalog'}
            </Button>
            <p className="text-xs text-[var(--text-tertiary)]">
              Shopify Product ID: {item.sunstone_product_id}
            </p>
          </div>

        ) : step === 'review' && product ? (
          /* ── Step 1: Cart Review ──────────────────────────────────── */
          <>
            {/* Product card */}
            <div className="flex gap-4 items-start">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.title}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0 bg-[var(--surface-raised)]"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-[var(--surface-raised)] flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-8 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[var(--text-primary)] truncate">{product.title}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{product.productType || 'Supply'}</p>
                {product.description && (
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 line-clamp-2">{product.description.slice(0, 120)}</p>
                )}
              </div>
            </div>

            {/* Current stock */}
            <div className="bg-[var(--surface-raised)] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Current stock</span>
                <span className={`text-sm font-semibold ${
                  item.quantity_on_hand <= item.reorder_threshold ? 'text-red-600' : 'text-[var(--text-primary)]'
                }`}>
                  {item.quantity_on_hand} {item.unit}
                </span>
              </div>
              {item.reorder_threshold > 0 && (
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-[var(--text-tertiary)]">Reorder threshold</span>
                  <span className="text-xs text-[var(--text-tertiary)]">{item.reorder_threshold} {item.unit}</span>
                </div>
              )}
            </div>

            {/* Variant selector */}
            {product.variants.length > 1 && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Variant</label>
                <select
                  value={selectedVariantIdx}
                  onChange={(e) => setSelectedVariantIdx(Number(e.target.value))}
                  className="w-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] px-4 py-3 text-sm text-[var(--text-primary)] min-h-[48px]"
                >
                  {product.variants.map((v, i) => (
                    <option key={i} value={i}>
                      {v.title} — ${parseFloat(v.price).toFixed(2)}
                      {v.sku ? ` (${v.sku})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Quantity */}
            <div>
              <Input
                label="Quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="text-lg"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">${unitPrice.toFixed(2)} per unit</p>
            </div>

            {/* Shipping address */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                Shipping Address
                {loadingAccount && <span className="text-xs text-[var(--text-tertiary)] ml-2">Loading...</span>}
              </label>
              <Input
                placeholder="Street address"
                value={shippingAddress.street}
                onChange={(e) => setShippingAddress((a) => ({ ...a, street: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="City"
                  value={shippingAddress.city}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, city: e.target.value }))}
                />
                <Input
                  placeholder="State"
                  value={shippingAddress.state}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, state: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="ZIP code"
                  value={shippingAddress.postalCode}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, postalCode: e.target.value }))}
                />
                <Input
                  placeholder="Country"
                  value={shippingAddress.country}
                  onChange={(e) => setShippingAddress((a) => ({ ...a, country: e.target.value }))}
                />
              </div>
            </div>

            {/* Totals */}
            <div className="bg-[var(--surface-raised)] rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">Subtotal</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">${estimatedSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-tertiary)]">
                <span>Tax + shipping calculated at checkout</span>
              </div>
            </div>

            {/* SF account warning */}
            {sfAccountMatched === false && !loadingAccount && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                We couldn&apos;t find your Sunstone account. Contact us at 385-999-5240 for assistance.
              </div>
            )}

            {/* Store link */}
            {product.url && (
              <a
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] underline underline-offset-2"
              >
                View on Sunstone Store
              </a>
            )}
          </>

        ) : step === 'payment' ? (
          /* ── Step 2: Payment ──────────────────────────────────────── */
          <div className="space-y-5">
            {/* Order summary */}
            <div className="bg-[var(--surface-raised)] rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal</span>
                <span className="text-[var(--text-primary)]">${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
                <span>Tax + shipping finalized by Sunstone</span>
              </div>
            </div>

            {paymentError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                {paymentError}
              </div>
            )}

            {sfAccountMatched === false ? (
              /* No SF account */
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-[var(--text-secondary)]">
                  We couldn&apos;t find your Sunstone account. Contact us at 385-999-5240 for assistance.
                </p>
              </div>
            ) : paymentMethods.length > 0 && !showNewCardForm ? (
              /* Saved cards */
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Pay with saved card</label>
                <div className="space-y-2">
                  {paymentMethods.map((card) => (
                    <label
                      key={card.id}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors min-h-[48px] ${
                        selectedCardId === card.id
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-50)]'
                          : 'border-[var(--border-default)] hover:bg-[var(--surface-raised)]'
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentCard"
                        value={card.id}
                        checked={selectedCardId === card.id}
                        onChange={() => setSelectedCardId(card.id)}
                        className="accent-[var(--accent-primary)]"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {card.brand} ending in {card.last4}
                        </span>
                        <span className="text-xs text-[var(--text-tertiary)] ml-2">
                          expires {card.expirationMonth}/{card.expirationYear}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setShowNewCardForm(true)}
                  className="text-sm text-[var(--accent-primary)] hover:underline"
                >
                  + Use a different card
                </button>
              </div>
            ) : (
              /* New card form */
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">
                  {paymentMethods.length > 0 ? 'Enter new card' : 'Enter your card details'}
                </label>
                <Input
                  placeholder="Name on card"
                  value={newCard.nameOnCard}
                  onChange={(e) => setNewCard((c) => ({ ...c, nameOnCard: e.target.value }))}
                />
                <Input
                  placeholder="Card number"
                  value={newCard.cardNumber}
                  onChange={(e) => setNewCard((c) => ({ ...c, cardNumber: formatCardNumber(e.target.value) }))}
                  maxLength={19}
                />
                <div className="grid grid-cols-3 gap-3">
                  <select
                    value={newCard.expirationMonth}
                    onChange={(e) => setNewCard((c) => ({ ...c, expirationMonth: e.target.value }))}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-3 text-sm text-[var(--text-primary)] min-h-[48px]"
                  >
                    <option value="">Month</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                    ))}
                  </select>
                  <select
                    value={newCard.expirationYear}
                    onChange={(e) => setNewCard((c) => ({ ...c, expirationYear: e.target.value }))}
                    className="rounded-xl border border-[var(--border-default)] bg-[var(--surface-base)] px-3 py-3 text-sm text-[var(--text-primary)] min-h-[48px]"
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 10 }, (_, i) => currentYear + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <Input
                    placeholder="CVV"
                    value={newCard.cvv}
                    onChange={(e) => setNewCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    maxLength={4}
                  />
                </div>
                {paymentMethods.length > 0 && (
                  <button
                    onClick={() => { setShowNewCardForm(false); setSelectedCardId(paymentMethods[0].id); }}
                    className="text-sm text-[var(--accent-primary)] hover:underline"
                  >
                    Use saved card instead
                  </button>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep('review')} className="flex-1">
                Back
              </Button>
              {paymentMethods.length > 0 && !showNewCardForm && selectedCardId ? (
                <Button
                  onClick={() => {
                    const card = paymentMethods.find((c) => c.id === selectedCardId);
                    const label = card ? `${card.brand} ending in ${card.last4}` : 'Saved card';
                    handlePay(selectedCardId, label);
                  }}
                  className="flex-1 text-white font-semibold"
                  style={{ backgroundColor: '#7A234A' }}
                >
                  Pay ${totals.subtotal.toFixed(2)}
                </Button>
              ) : showNewCardForm || paymentMethods.length === 0 ? (
                <Button
                  onClick={handleAddCardAndPay}
                  disabled={sfAccountMatched === false}
                  className="flex-1 text-white font-semibold"
                  style={{ backgroundColor: '#7A234A' }}
                >
                  Save Card & Pay ${totals.subtotal.toFixed(2)}
                </Button>
              ) : null}
            </div>
          </div>

        ) : step === 'processing' ? (
          /* ── Step 3: Processing ───────────────────────────────────── */
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[var(--text-secondary)] mt-4">{processingMsg}</p>
          </div>

        ) : step === 'confirmation' ? (
          /* ── Step 4: Confirmation ─────────────────────────────────── */
          <div className="text-center space-y-4 py-4">
            <div className={`w-14 h-14 rounded-full mx-auto flex items-center justify-center ${
              paymentError && !chargedCard ? 'bg-amber-50' : 'bg-green-50'
            }`}>
              {paymentError && !chargedCard ? (
                <svg className="w-7 h-7 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              )}
            </div>
            <div>
              <p className="text-lg font-bold text-[var(--text-primary)]">
                {paymentError && !chargedCard ? 'Order Submitted' : 'Order Confirmed!'}
              </p>
              {sfResult?.opportunityName && (
                <p className="text-sm text-[var(--text-secondary)]">{sfResult.opportunityName}</p>
              )}
            </div>

            {paymentError && !chargedCard && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 text-left">
                {paymentError}
              </div>
            )}

            {product && selectedVariant && (
              <div className="text-sm text-[var(--text-secondary)]">
                {product.title}
                {selectedVariant.title !== 'Default Title' ? ` — ${selectedVariant.title}` : ''}
                {' x '}{quantity} — ${unitPrice.toFixed(2)} each
              </div>
            )}

            <div className="bg-[var(--surface-raised)] rounded-xl p-4 space-y-2 text-sm text-left">
              <div className="flex justify-between">
                <span className="text-[var(--text-secondary)]">Subtotal</span>
                <span className="text-[var(--text-primary)]">${totals.subtotal.toFixed(2)}</span>
              </div>
              {sfResult && sfResult.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Tax</span>
                  <span className="text-[var(--text-primary)]">${sfResult.tax.toFixed(2)}</span>
                </div>
              )}
              {sfResult && sfResult.shipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-secondary)]">Shipping</span>
                  <span className="text-[var(--text-primary)]">${sfResult.shipping.toFixed(2)}</span>
                </div>
              )}
              {sfResult && sfResult.grandTotal > 0 && (
                <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2">
                  <span className="font-semibold text-[var(--text-primary)]">Total{chargedCard ? ' charged' : ''}</span>
                  <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>
                    ${sfResult.grandTotal.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {chargedCard && (
              <p className="text-xs text-[var(--text-tertiary)]">
                Charged to: {chargedCard}
              </p>
            )}

            {shippingAddress.street && (
              <div className="text-xs text-[var(--text-tertiary)]">
                Shipping to: {shippingAddress.street}, {shippingAddress.city}, {shippingAddress.state} {shippingAddress.postalCode}
              </div>
            )}

            <div className="space-y-1">
              <p className="text-sm text-[var(--text-secondary)]">
                Your order will be reviewed and shipped within 1-2 business days.
              </p>
            </div>
          </div>
        ) : null}
      </ModalBody>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      {step === 'review' && !loading && product && (
        <ModalFooter>
          <Button variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleContinueToPayment}
            loading={creatingReorder}
            disabled={sfAccountMatched === false}
            className="text-white font-semibold"
            style={{ backgroundColor: '#7A234A' }}
          >
            {creatingReorder ? 'Preparing...' : 'Continue to Payment'}
          </Button>
        </ModalFooter>
      )}

      {step === 'confirmation' && (
        <ModalFooter>
          <Button variant="secondary" onClick={handleClose}>Done</Button>
        </ModalFooter>
      )}
    </Modal>
  );
}
