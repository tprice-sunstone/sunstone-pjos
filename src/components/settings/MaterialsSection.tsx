// ============================================================================
// MaterialsSection — src/components/settings/MaterialsSection.tsx
// ============================================================================
// Manages the materials list in Settings. System materials (is_system=true)
// cannot be deleted. Users can add custom materials, edit names/abbreviations,
// and reorder.
// ============================================================================

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import type { Material } from '@/types';

interface MaterialsSectionProps {
  tenantId: string;
}

export default function MaterialsSection({ tenantId }: MaterialsSectionProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  // Add state
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editShortName, setEditShortName] = useState('');

  const supabase = createClient();

  const loadMaterials = async () => {
    const { data } = await supabase
      .from('materials')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('sort_order')
      .order('name');
    setMaterials((data || []) as Material[]);
    setLoading(false);
  };

  useEffect(() => { loadMaterials(); }, [tenantId]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const nextSort = materials.length > 0
        ? Math.max(...materials.map((m) => m.sort_order)) + 1
        : 1;
      const { error } = await supabase.from('materials').insert({
        tenant_id: tenantId,
        name: newName.trim(),
        abbreviation: newShortName.trim() || null,
        sort_order: nextSort,
        is_system: false,
      });
      if (error) {
        if (error.code === '23505') toast.error('A material with this name already exists');
        else toast.error(error.message);
        return;
      }
      toast.success('Material added');
      setShowAdd(false); setNewName(''); setNewShortName('');
      await loadMaterials();
    } catch { toast.error('Failed to add material'); }
    finally { setSaving(false); }
  };

  const startEdit = (m: Material) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditShortName(m.abbreviation || '');
  };

  const handleEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('materials')
        .update({ name: editName.trim(), abbreviation: editShortName.trim() || null })
        .eq('id', editingId);
      if (error) {
        if (error.code === '23505') toast.error('A material with this name already exists');
        else toast.error(error.message);
        return;
      }
      toast.success('Material updated');
      setEditingId(null);
      await loadMaterials();
    } catch { toast.error('Failed to update material'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (m: Material) => {
    if (m.is_system) {
      toast.error('System materials cannot be deleted');
      return;
    }
    if (!confirm(`Delete "${m.name}"? Items using this material will keep their current assignment but it won't be available for new items.`)) return;
    try {
      const { error } = await supabase.from('materials').update({ is_active: false }).eq('id', m.id);
      if (error) throw error;
      toast.success('Material removed');
      await loadMaterials();
    } catch { toast.error('Failed to delete material'); }
  };

  const handleReorder = async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= materials.length) return;
    const updated = [...materials];
    const sortA = updated[index].sort_order;
    const sortB = updated[swapIndex].sort_order;
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    setMaterials(updated);
    try {
      await Promise.all([
        supabase.from('materials').update({ sort_order: sortB }).eq('id', updated[index].id),
        supabase.from('materials').update({ sort_order: sortA }).eq('id', updated[swapIndex].id),
      ]);
    } catch { toast.error('Failed to reorder'); await loadMaterials(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">Materials</h3>
          <p className="text-sm text-[var(--text-tertiary)]">
            Standardized material names for consistency across your inventory.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)} disabled={showAdd}>
          Add Material
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="p-4 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Name</label>
              <input
                type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. 18k Gold Fill"
                className="w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowAdd(false); setNewName(''); setNewShortName(''); } }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Abbreviation (optional)</label>
              <input
                type="text" value={newShortName} onChange={(e) => setNewShortName(e.target.value)}
                placeholder="e.g. 18kGF"
                className="w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setShowAdd(false); setNewName(''); setNewShortName(''); } }}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setNewName(''); setNewShortName(''); }}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving || !newName.trim()}>
              {saving ? 'Adding...' : 'Add Material'}
            </Button>
          </div>
        </div>
      )}

      {/* Materials list */}
      {loading ? (
        <div className="text-sm text-[var(--text-tertiary)] py-2">Loading...</div>
      ) : materials.length > 0 ? (
        <div className="border border-[var(--border-default)] rounded-xl overflow-hidden divide-y divide-[var(--border-subtle)]">
          {materials.map((m, index) => (
            <div key={m.id}>
              {editingId === m.id ? (
                <div className="p-3 bg-[var(--surface-raised)] space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      placeholder="Name"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    />
                    <input
                      type="text" value={editShortName} onChange={(e) => setEditShortName(e.target.value)}
                      className="w-24 h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
                      placeholder="Abbrev"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleEdit(); if (e.key === 'Escape') setEditingId(null); }}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button variant="primary" size="sm" onClick={handleEdit} disabled={saving}>
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5 hover:bg-[var(--surface-raised)] transition-colors">
                  {/* Reorder buttons */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => handleReorder(index, 'up')}
                      disabled={index === 0}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors p-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReorder(index, 'down')}
                      disabled={index === materials.length - 1}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors p-0.5"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </button>
                  </div>

                  {/* Material info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{m.name}</span>
                      {m.abbreviation && (
                        <span className="text-xs text-[var(--text-tertiary)] bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded font-mono">
                          {m.abbreviation}
                        </span>
                      )}
                      {m.is_system && (
                        <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--surface-subtle)] px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wider">
                          Default
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(m)}
                      className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] min-w-[32px] min-h-[32px] flex items-center justify-center"
                      title="Edit"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                    </button>
                    {!m.is_system && (
                      <button
                        onClick={() => handleDelete(m)}
                        className="text-[var(--text-tertiary)] hover:text-red-500 transition-colors p-1.5 rounded-lg hover:bg-red-50 min-w-[32px] min-h-[32px] flex items-center justify-center"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[var(--text-tertiary)] py-4 text-center">
          No materials found. They should have been created automatically.
        </div>
      )}
    </div>
  );
}
