// ============================================================================
// SuppliersSection — Settings Page Component
// ============================================================================
// Manages suppliers with CRUD. Sunstone is pre-seeded and cannot be
// deleted. Full contact, address, social, and account fields.
// ============================================================================

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import type { Supplier } from '@/types';

interface SuppliersSectionProps {
  tenantId: string;
}

type SupplierForm = {
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  account_number: string;
  notes: string;
};

const emptyForm: SupplierForm = {
  name: '', contact_name: '', contact_email: '', contact_phone: '', website: '',
  street: '', city: '', state: '', postal_code: '', country: '',
  instagram: '', facebook: '', tiktok: '', account_number: '', notes: '',
};

const inputCls = 'w-full h-10 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)] min-h-[44px]';
const labelCls = 'block text-xs font-medium text-[var(--text-secondary)] mb-1';

export default function SuppliersSection({ tenantId }: SuppliersSectionProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SupplierForm>(emptyForm);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<SupplierForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────

  const loadSuppliers = useCallback(async () => {
    try {
      const res = await fetch(`/api/suppliers?tenantId=${tenantId}`);
      const data = await res.json();
      if (Array.isArray(data)) setSuppliers(data);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) loadSuppliers();
  }, [tenantId, loadSuppliers]);

  // ── Add ─────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!addForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId, ...addForm }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to add');
        return;
      }
      toast.success('Supplier added');
      setShowAdd(false);
      setAddForm(emptyForm);
      await loadSuppliers();
    } catch {
      toast.error('Failed to add supplier');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ────────────────────────────────────────────────────────────

  const startEdit = (s: Supplier) => {
    setEditingId(s.id);
    setEditForm({
      name: s.name,
      contact_name: s.contact_name || '',
      contact_email: s.contact_email || '',
      contact_phone: s.contact_phone || '',
      website: s.website?.replace(/^https?:\/\//, '') || '',
      street: s.street || '',
      city: s.city || '',
      state: s.state || '',
      postal_code: s.postal_code || '',
      country: s.country || '',
      instagram: s.instagram || '',
      facebook: s.facebook || '',
      tiktok: s.tiktok || '',
      account_number: s.account_number || '',
      notes: s.notes || '',
    });
  };

  const handleEdit = async () => {
    if (!editingId || !editForm.name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/suppliers/${editingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to update');
        return;
      }
      toast.success('Supplier updated');
      setEditingId(null);
      await loadSuppliers();
    } catch {
      toast.error('Failed to update supplier');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────

  const handleDelete = async (s: Supplier) => {
    if (s.is_sunstone) return;
    if (!confirm(`Delete "${s.name}"? This will unlink it from any inventory items.`)) return;

    try {
      const res = await fetch(`/api/suppliers/${s.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete');
        return;
      }
      toast.success('Supplier deleted');
      await loadSuppliers();
    } catch {
      toast.error('Failed to delete');
    }
  };

  // ── Contact summary line ───────────────────────────────────────────

  const contactSummary = (s: Supplier) => {
    const parts: string[] = [];
    if (s.contact_phone) parts.push(s.contact_phone);
    if (s.contact_email) parts.push(s.contact_email);
    if (s.website) parts.push(s.website.replace(/^https?:\/\//, ''));
    return parts.length > 0 ? parts.join(' · ') : 'No contact info added';
  };

  // ── Supplier form ──────────────────────────────────────────────────

  const SupplierFormPanel = ({
    form,
    setForm,
    onSave,
    onCancel,
    isSunstone,
  }: {
    form: SupplierForm;
    setForm: (f: SupplierForm) => void;
    onSave: () => void;
    onCancel: () => void;
    isSunstone?: boolean;
  }) => (
    <div className="p-4 border border-[var(--border-default)] rounded-xl bg-[var(--surface-raised)] space-y-4">
      {/* Supplier Name */}
      <div>
        <label className={labelCls}>Supplier Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputCls}
          placeholder="Supplier name"
          autoFocus
          disabled={isSunstone}
        />
      </div>

      {/* Contact Information */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Contact Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Contact Person</label>
            <input type="text" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className={inputCls} placeholder="Jane Smith" />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inputCls} placeholder="jane@supplier.com" />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input type="tel" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inputCls} placeholder="555-123-4567" />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} className={inputCls} placeholder="supplier.com" />
          </div>
        </div>
      </div>

      {/* Address */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Address</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Street</label>
            <input type="text" value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className={inputCls} placeholder="123 Main St" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className={labelCls}>City</label>
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} placeholder="City" />
            </div>
            <div>
              <label className={labelCls}>State</label>
              <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls} placeholder="CA" />
            </div>
            <div>
              <label className={labelCls}>ZIP</label>
              <input type="text" value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} className={inputCls} placeholder="90001" />
            </div>
            <div>
              <label className={labelCls}>Country</label>
              <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls} placeholder="US" />
            </div>
          </div>
        </div>
      </div>

      {/* Social Media */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Social Media</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Instagram</label>
            <input type="text" value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className={inputCls} placeholder="@handle" />
          </div>
          <div>
            <label className={labelCls}>Facebook</label>
            <input type="text" value={form.facebook} onChange={(e) => setForm({ ...form, facebook: e.target.value })} className={inputCls} placeholder="pagename" />
          </div>
          <div>
            <label className={labelCls}>TikTok</label>
            <input type="text" value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} className={inputCls} placeholder="@handle" />
          </div>
        </div>
      </div>

      {/* Account & Notes */}
      <div>
        <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Account & Notes</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Account Number</label>
            <input type="text" value={form.account_number} onChange={(e) => setForm({ ...form, account_number: e.target.value })} className={inputCls} placeholder="Your account # with this supplier" />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full h-20 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)] resize-none"
              placeholder="Free shipping over $200, sales rep is John..."
            />
          </div>
        </div>
      </div>

      <div className="flex gap-2 justify-end pt-2 border-t border-[var(--border-subtle)]">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" size="sm" onClick={onSave} disabled={saving || !form.name.trim()}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );

  // ── Render ──────────────────────────────────────────────────────────

  if (loading) {
    return <div className="p-4 text-sm text-[var(--text-tertiary)]">Loading suppliers...</div>;
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-[var(--text-primary)]">Suppliers</h3>
        <p className="text-sm text-[var(--text-tertiary)]">
          Manage your chain and supply vendors. Contact info, websites, and account details all in one place.
        </p>
      </div>

      {/* Supplier list */}
      <div className="border border-[var(--border-default)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)]">
        {suppliers.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-[var(--text-tertiary)]">No suppliers yet</div>
        )}
        {suppliers.map((s) => (
          <div key={s.id}>
            {editingId === s.id ? (
              <SupplierFormPanel
                form={editForm}
                setForm={setEditForm}
                onSave={handleEdit}
                onCancel={() => setEditingId(null)}
                isSunstone={s.is_sunstone}
              />
            ) : (
              <div className="flex items-center justify-between px-4 py-3 min-h-[56px]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {s.is_sunstone && (
                      <span className="inline-flex items-center gap-1 text-amber-600 text-[11px] font-semibold bg-amber-50 px-1.5 py-0.5 rounded">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        Primary
                      </span>
                    )}
                    <span className="text-sm text-[var(--text-primary)] font-medium">{s.name}</span>
                  </div>
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5 truncate">{contactSummary(s)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(s)}
                    className="text-xs text-[var(--accent-primary)] hover:underline px-2 py-1 min-h-[44px] flex items-center"
                  >
                    Edit
                  </button>
                  {s.is_sunstone ? (
                    <span className="text-[var(--text-tertiary)] px-2 py-1 min-h-[44px] flex items-center" title="Sunstone cannot be deleted">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDelete(s)}
                      className="text-xs text-red-500 hover:underline px-2 py-1 min-h-[44px] flex items-center"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add form */}
      {showAdd ? (
        <SupplierFormPanel
          form={addForm}
          setForm={setAddForm}
          onSave={handleAdd}
          onCancel={() => { setShowAdd(false); setAddForm(emptyForm); }}
        />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
          + Add Supplier
        </Button>
      )}
    </div>
  );
}
