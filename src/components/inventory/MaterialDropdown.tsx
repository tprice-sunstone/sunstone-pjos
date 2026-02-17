// ============================================================================
// MaterialDropdown — src/components/inventory/MaterialDropdown.tsx
// ============================================================================
// Dropdown for selecting a standardized material from the materials table.
// Includes "Add new" inline for convenience.
// ============================================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Material } from '@/types';

interface MaterialDropdownProps {
  tenantId: string;
  value: string | null;            // material_id
  onChange: (materialId: string | null) => void;
  /** Called when a new material is created, so parent can refresh if needed */
  onMaterialCreated?: (material: Material) => void;
}

export default function MaterialDropdown({
  tenantId,
  value,
  onChange,
  onMaterialCreated,
}: MaterialDropdownProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newShortName, setNewShortName] = useState('');
  const [saving, setSaving] = useState(false);
  const addInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!tenantId) return;
    const load = async () => {
      const { data } = await supabase
        .from('materials')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('sort_order')
        .order('name');
      setMaterials((data || []) as Material[]);
      setLoading(false);
    };
    load();
  }, [tenantId]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const nextSort = materials.length > 0
        ? Math.max(...materials.map((m) => m.sort_order)) + 1
        : 1;

      const { data, error } = await supabase
        .from('materials')
        .insert({
          tenant_id: tenantId,
          name: newName.trim(),
          short_name: newShortName.trim() || null,
          sort_order: nextSort,
          is_system: false,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          // Duplicate — find and select the existing one
          const existing = materials.find(
            (m) => m.name.toLowerCase() === newName.trim().toLowerCase()
          );
          if (existing) {
            onChange(existing.id);
          }
        }
        return;
      }

      if (data) {
        const newMat = data as Material;
        setMaterials((prev) => [...prev, newMat]);
        onChange(newMat.id);
        onMaterialCreated?.(newMat);
      }
    } finally {
      setSaving(false);
      setShowAdd(false);
      setNewName('');
      setNewShortName('');
    }
  };

  const selectedMaterial = materials.find((m) => m.id === value);

  if (loading) {
    return (
      <div>
        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Material</label>
        <div className="h-[42px] flex items-center px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-tertiary)] text-sm">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">Material</label>

      {!showAdd ? (
        <div className="space-y-2">
          <select
            value={value || ''}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '__add_new__') {
                setShowAdd(true);
                setTimeout(() => addInputRef.current?.focus(), 50);
              } else {
                onChange(val || null);
              }
            }}
            className="w-full h-[42px] px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-subtle)] transition-colors appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%239ca3af' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem',
            }}
          >
            <option value="">Select material...</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}{m.abbreviation ? ` (${m.abbreviation})` : ''}
              </option>
            ))}
            <option value="__add_new__">+ Add new material</option>
          </select>
        </div>
      ) : (
        <div className="space-y-2 p-3 rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)]">
          <input
            ref={addInputRef}
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Material name (e.g. 18k Gold Fill)"
            className="w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-subtle)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setShowAdd(false); setNewName(''); setNewShortName(''); }
            }}
          />
          <input
            type="text"
            value={newShortName}
            onChange={(e) => setNewShortName(e.target.value)}
            placeholder="Abbreviation (optional, e.g. GF)"
            className="w-full h-9 px-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-subtle)]"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') { setShowAdd(false); setNewName(''); setNewShortName(''); }
            }}
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNewName(''); setNewShortName(''); }}
              className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!newName.trim() || saving}
              className="px-3 py-1.5 text-xs font-medium text-white rounded-lg transition-colors disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {saving ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}