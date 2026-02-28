'use client';

import { useState, useEffect } from 'react';

interface SpotlightProduct {
  handle: string;
  title: string;
  imageUrl: string | null;
  price: string | null;
  productType: string;
  url: string;
}

interface SpotlightConfig {
  mode: 'rotate' | 'custom';
  custom_product_handle?: string;
  custom_expires_at?: string;
}

interface SpotlightData {
  config: SpotlightConfig;
  configUpdatedAt: string | null;
  catalog: {
    products: SpotlightProduct[];
    discountCount: number;
    syncedAt: string;
  } | null;
}

export default function SpotlightPage() {
  const [data, setData] = useState<SpotlightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [selectedHandle, setSelectedHandle] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(7);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch('/api/admin/spotlight');
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setData(json);
      if (json.config.custom_product_handle) {
        setSelectedHandle(json.config.custom_product_handle);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load spotlight data' });
    } finally {
      setLoading(false);
    }
  }

  async function handlePin() {
    if (!selectedHandle) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/spotlight', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'custom',
          custom_product_handle: selectedHandle,
          duration_days: durationDays,
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setMessage({ type: 'success', text: 'Product pinned to spotlight' });
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Failed to pin product' });
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/spotlight', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'rotate' }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setSelectedHandle('');
      setMessage({ type: 'success', text: 'Reset to weekly rotation' });
      fetchData();
    } catch {
      setMessage({ type: 'error', text: 'Failed to reset' });
    } finally {
      setSaving(false);
    }
  }

  async function handleSync() {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/spotlight', { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Sync failed');
      setMessage({ type: 'success', text: `Synced ${json.sync?.productCount || 0} products from Shopify` });
      fetchData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Sync failed' });
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-[var(--surface-subtle)] rounded" />
        <div className="h-40 bg-[var(--surface-subtle)] rounded-xl" />
      </div>
    );
  }

  const config = data?.config;
  const products = data?.catalog?.products || [];
  const syncedAt = data?.catalog?.syncedAt;
  const isCustom = config?.mode === 'custom';
  const pinnedProduct = isCustom
    ? products.find((p) => p.handle === config?.custom_product_handle)
    : null;
  const expiresAt = config?.custom_expires_at ? new Date(config.custom_expires_at) : null;
  const isExpired = expiresAt ? expiresAt <= new Date() : false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Spotlight Manager</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Control which Sunstone product appears on every tenant&apos;s dashboard card.
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`px-4 py-3 rounded-lg text-sm font-medium ${
            message.type === 'success'
              ? 'bg-green-500/10 text-green-600'
              : 'bg-red-500/10 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Current Status */}
      <div className="bg-[var(--surface-base)] border border-[var(--border-default)] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          Current Status
        </h2>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block w-2.5 h-2.5 rounded-full ${
              isCustom && !isExpired ? 'bg-amber-500' : 'bg-green-500'
            }`}
          />
          <span className="text-sm text-[var(--text-primary)]">
            {isCustom && !isExpired
              ? `Pinned: ${pinnedProduct?.title || config?.custom_product_handle}`
              : 'Auto-rotation (weekly)'}
          </span>
        </div>
        {isCustom && expiresAt && !isExpired && (
          <p className="text-xs text-[var(--text-tertiary)]">
            Expires: {expiresAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {isCustom && isExpired && (
          <p className="text-xs text-amber-600">Pin has expired — currently falling back to rotation</p>
        )}
      </div>

      {/* Catalog Sync */}
      <div className="bg-[var(--surface-base)] border border-[var(--border-default)] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
              Shopify Catalog
            </h2>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">
              {products.length} products cached
              {syncedAt && (
                <> &middot; Last synced {new Date(syncedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>
              )}
              {data?.catalog?.discountCount ? ` \u00B7 ${data.catalog.discountCount} active discounts` : ''}
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors disabled:opacity-50"
          >
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>

        {!data?.catalog && (
          <p className="text-sm text-amber-600">
            No cached catalog found. Click &quot;Sync Now&quot; to pull products from Shopify.
          </p>
        )}
      </div>

      {/* Pin a Product */}
      <div className="bg-[var(--surface-base)] border border-[var(--border-default)] rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
          Pin a Product
        </h2>

        {products.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No products available. Sync the Shopify catalog first.
          </p>
        ) : (
          <>
            {/* Product picker */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Select Product
              </label>
              <select
                value={selectedHandle}
                onChange={(e) => setSelectedHandle(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              >
                <option value="">Choose a product...</option>
                {products.map((p) => (
                  <option key={p.handle} value={p.handle}>
                    {p.title} {p.price ? `($${p.price})` : ''} {p.productType ? `- ${p.productType}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Selected product preview */}
            {selectedHandle && (() => {
              const sel = products.find((p) => p.handle === selectedHandle);
              if (!sel) return null;
              return (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--surface-subtle)]">
                  {sel.imageUrl ? (
                    <img
                      src={sel.imageUrl}
                      alt={sel.title}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-accent-500/20 flex items-center justify-center">
                      <span className="text-accent-500 text-xs font-bold">S</span>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{sel.title}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {sel.price ? `$${sel.price}` : 'No price'} &middot; {sel.productType || 'Uncategorized'}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Duration picker */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Pin Duration
              </label>
              <div className="flex gap-2">
                {[
                  { label: '3 days', value: 3 },
                  { label: '7 days', value: 7 },
                  { label: '14 days', value: 14 },
                  { label: '30 days', value: 30 },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDurationDays(opt.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      durationDays === opt.value
                        ? 'border-accent-500 bg-accent-500/10 text-accent-600'
                        : 'border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePin}
                disabled={!selectedHandle || saving}
                className="px-5 py-2.5 text-sm font-semibold rounded-lg text-[var(--text-on-accent)] disabled:opacity-50 transition-colors"
                style={{ background: 'var(--accent-primary)' }}
              >
                {saving ? 'Saving...' : 'Pin Product'}
              </button>
              {isCustom && (
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors disabled:opacity-50"
                >
                  Reset to Rotation
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Product List Preview */}
      {products.length > 0 && (
        <div className="bg-[var(--surface-base)] border border-[var(--border-default)] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide">
            Catalog ({products.length} products)
          </h2>
          <div className="divide-y divide-[var(--border-subtle)]">
            {products.map((p) => (
              <div key={p.handle} className="flex items-center gap-3 py-2.5">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.title} className="w-8 h-8 rounded object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded bg-[var(--surface-subtle)] flex items-center justify-center">
                    <span className="text-[10px] text-[var(--text-tertiary)]">?</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{p.title}</p>
                </div>
                <span className="text-xs text-[var(--text-tertiary)]">{p.productType}</span>
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  {p.price ? `$${p.price}` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
