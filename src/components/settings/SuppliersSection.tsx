// ============================================================================
// SuppliersSection — Settings Page Component
// ============================================================================
// New file: src/components/settings/SuppliersSection.tsx
//
// Manages suppliers with CRUD. Sunstone Supply is pre-seeded and cannot be
// deleted. Simple list with edit/delete actions.
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import type { Supplier } from '@/types';

interface SuppliersSectionProps {
  tenantId: string;
}

export default function SuppliersSection({ tenantId }: SuppliersSectionProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', contact_name: '', contact_email: '', contact_phone: '', website: '', notes: '' });
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', contact_name: '', contact_email: '', contact_phone: '', website: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // ── Load ────────────────────────────────────────────────────────────

  const loadSuppliers = async () => {
    try {
      const res = await fetch(`/api/suppliers?tenantId=${tenantId}`);
      const data = await res.json();
      if (Array.isArray(data)) setSuppliers(data);
    } catch {
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) loadSuppliers();
  }, [tenantId]);

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
      setAddForm({ name: '', contact_name: '', contact_email: '', contact_phone: '', website: '', notes: '' });
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
      website: s.website || '',
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
    if (!confirm(`Delete "${s.name}"?`)) return;

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

  // ── Supplier form fields ────────────────────────────────────────────

  const SupplierForm = ({
    form,
    setForm,
    onSave,
    onCancel,
  }: {
    form: typeof addForm;
    setForm: (f: typeof addForm) => void;
    onSave: () => void;
    onCancel: () => void;
  }) => (
    <div className="p-3 border border-[var(--border-default)] rounded-xl bg-[var(--surface-raised)] space-y-2">
      <input
        type="text"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        placeholder="Supplier name *"
        autoFocus
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={form.contact_name}
          onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
          className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          placeholder="Contact name"
        />
        <input
          type="email"
          value={form.contact_email}
          onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
          className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          placeholder="Email"
        />
        <input
          type="tel"
          value={form.contact_phone}
          onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
          className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          placeholder="Phone"
        />
        <input
          type="url"
          value={form.website}
          onChange={(e) => setForm({ ...form, website: e.target.value })}
          className="h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
          placeholder="Website"
        />
      </div>
      <textarea
        value={form.notes}
        onChange={(e) => setForm({ ...form, notes: e.target.value })}
        className="w-full h-16 px-3 py-2 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] resize-none"
        placeholder="Notes (optional)"
      />
      <div className="flex gap-2 justify-end">
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
          Manage your chain and supply vendors.
        </p>
      </div>

      {/* Supplier list */}
      <div className="border border-[var(--border-default)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)]">
        {suppliers.map((s) => (
          <div key={s.id}>
            {editingId === s.id ? (
              <SupplierForm
                form={editForm}
                setForm={setEditForm}
                onSave={handleEdit}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-center justify-between px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {s.is_sunstone && <span className="text-amber-500">✦</span>}
                    <span className="text-sm text-[var(--text-primary)] font-medium">{s.name}</span>
                  </div>
                  {s.website && (
                    <span className="text-xs text-[var(--text-tertiary)]">{s.website.replace(/^https?:\/\//, '')}</span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => startEdit(s)}
                    className="text-xs text-[var(--accent-primary)] hover:underline px-2 py-1"
                  >
                    Edit
                  </button>
                  {s.is_sunstone ? (
                    <span className="text-[var(--text-tertiary)] px-2 py-1" title="Sunstone Supply cannot be deleted">
                      🔒
                    </span>
                  ) : (
                    <button
                      onClick={() => handleDelete(s)}
                      className="text-xs text-red-500 hover:underline px-2 py-1"
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
        <SupplierForm
          form={addForm}
          setForm={setAddForm}
          onSave={handleAdd}
          onCancel={() => { setShowAdd(false); setAddForm({ name: '', contact_name: '', contact_email: '', contact_phone: '', website: '', notes: '' }); }}
        />
      ) : (
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
          + Add Supplier
        </Button>
      )}
    </div>
  );
}