'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Button,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui';
import { TAG_PALETTE, getTagColor } from '@/lib/tag-colors';
import type { ClientTag } from '@/types';

const TAG_COLORS = TAG_PALETTE.map((p) => ({ hex: p.text, label: p.label }));

interface TagWithCount extends ClientTag {
  usage_count: number;
}

interface TagManagerModalProps {
  tenantId: string;
  tags: TagWithCount[];
  onClose: () => void;
  onRefresh: () => void;
}

export default function TagManagerModal({ tenantId, tags, onClose, onRefresh }: TagManagerModalProps) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0].hex);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TagWithCount | null>(null);

  const createTag = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, name: newName.trim(), color: newColor }),
    });
    setSaving(false);
    if (res.ok) {
      setNewName('');
      setNewColor(TAG_COLORS[0].hex);
      onRefresh();
      toast.success('Tag created');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to create tag');
    }
  };

  const updateTag = async () => {
    if (!editingId || !editName.trim()) return;
    const res = await fetch(`/api/tags/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    if (res.ok) {
      setEditingId(null);
      onRefresh();
      toast.success('Tag updated');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to update tag');
    }
  };

  const deleteTag = async (id: string) => {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConfirmDelete(null);
      onRefresh();
      toast.success('Tag deleted');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="md">
      <ModalHeader>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Manage Tags</h2>
      </ModalHeader>
      <ModalBody>
        {/* Create new tag */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name"
              onKeyDown={(e) => e.key === 'Enter' && createTag()}
              className="flex-1 min-w-[140px] text-[13px] px-3 py-2 border border-[var(--border-default)] rounded-lg bg-[var(--surface-raised)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-subtle)]"
            />
            <Button variant="primary" size="sm" onClick={createTag} disabled={saving || !newName.trim()}>
              Add
            </Button>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {TAG_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setNewColor(c.hex)}
                className="w-6 h-6 rounded-full flex-shrink-0 transition-all"
                style={{
                  backgroundColor: c.hex,
                  boxShadow: newColor === c.hex ? `0 0 0 2px var(--surface-base), 0 0 0 4px ${c.hex}` : 'none',
                }}
                title={c.label}
              />
            ))}
          </div>
        </div>

        {/* Existing tags */}
        <div className="divide-y divide-[var(--border-subtle)]">
          {tags.map((tag) => (
            <div key={tag.id}>
              {editingId === tag.id ? (
                <div className="py-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 min-w-[140px] text-[13px] px-3 py-2 border border-[var(--border-default)] rounded-lg bg-[var(--surface-raised)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-subtle)]"
                      onKeyDown={(e) => e.key === 'Enter' && updateTag()}
                      autoFocus
                    />
                    <Button variant="primary" size="sm" onClick={updateTag}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setEditColor(c.hex)}
                        className="w-6 h-6 rounded-full flex-shrink-0 transition-all"
                        style={{
                          backgroundColor: c.hex,
                          boxShadow: editColor === c.hex ? `0 0 0 2px var(--surface-base), 0 0 0 4px ${c.hex}` : 'none',
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-1 py-2.5 group" style={{ minHeight: 44 }}>
                  {/* Color dot using stored color */}
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="flex-1 text-sm text-[var(--text-primary)]">{tag.name}</span>
                  {tag.auto_apply && (
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--surface-subtle)] text-[var(--text-tertiary)] uppercase">
                      Auto
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{tag.usage_count}</span>
                  <button
                    onClick={() => { setEditingId(tag.id); setEditName(tag.name); setEditColor(tag.color); }}
                    className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(tag)}
                    className="text-[var(--text-tertiary)] hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 transition-opacity"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="mt-4 p-3 bg-error-50 border border-error-200 rounded-lg">
            <p className="text-sm text-error-600">
              Delete &quot;{confirmDelete.name}&quot;? This will remove it from {confirmDelete.usage_count} client{confirmDelete.usage_count !== 1 ? 's' : ''}.
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="danger" size="sm" onClick={() => deleteTag(confirmDelete.id)}>Delete</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Done</Button>
      </ModalFooter>
    </Modal>
  );
}
