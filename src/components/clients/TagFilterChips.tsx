'use client';

import { useState } from 'react';
import { getTagColor } from '@/lib/tag-colors';
import type { ClientTag, ClientSegment } from '@/types';

interface TagWithCount extends ClientTag {
  usage_count: number;
}

interface TagFilterChipsProps {
  tags: TagWithCount[];
  selectedTagIds: string[];
  segments: ClientSegment[];
  activeSegment: ClientSegment | null;
  savingSegment: boolean;
  canEdit: boolean;
  onToggleTag: (tagId: string) => void;
  onClearFilters: () => void;
  onSaveSegment: () => void;
  onApplySegment: (segment: ClientSegment) => void;
  onDeleteSegment: (id: string) => void;
  onManageTags: () => void;
}

export default function TagFilterChips({
  tags,
  selectedTagIds,
  segments,
  activeSegment,
  savingSegment,
  canEdit,
  onToggleTag,
  onClearFilters,
  onSaveSegment,
  onApplySegment,
  onDeleteSegment,
  onManageTags,
}: TagFilterChipsProps) {
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);

  if (tags.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {tags.map((tag) => {
        const colors = getTagColor(tag.color);
        const isSelected = selectedTagIds.includes(tag.id);
        return (
          <button
            key={tag.id}
            onClick={() => onToggleTag(tag.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              backgroundColor: isSelected ? tag.color : colors.bg,
              color: isSelected ? '#fff' : colors.text,
              border: `1px solid ${isSelected ? tag.color : 'transparent'}`,
            }}
          >
            {tag.name}
            <span className="opacity-60">{tag.usage_count}</span>
          </button>
        );
      })}

      {selectedTagIds.length > 0 && (
        <>
          <button
            onClick={onClearFilters}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-2 py-1.5"
          >
            Clear filters
          </button>
          <button
            onClick={onSaveSegment}
            disabled={savingSegment}
            className="text-xs text-[var(--accent-primary)] hover:underline px-2 py-1.5"
          >
            {savingSegment ? 'Saving...' : 'Save as Segment'}
          </button>
        </>
      )}

      {/* Segments dropdown */}
      {segments.length > 0 && (
        <div className="relative ml-auto">
          <button
            onClick={() => setShowSegmentDropdown(!showSegmentDropdown)}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded-lg border border-[var(--border-default)]"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {activeSegment ? activeSegment.name : 'Segments'}
          </button>
          {showSegmentDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSegmentDropdown(false)} />
              <div className="absolute right-0 top-full mt-1 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl shadow-lg z-20 min-w-[200px] py-1">
                {segments.map((seg) => (
                  <div key={seg.id} className="flex items-center justify-between px-3 py-2 hover:bg-[var(--surface-subtle)]">
                    <button
                      onClick={() => { onApplySegment(seg); setShowSegmentDropdown(false); }}
                      className="text-sm text-[var(--text-primary)] text-left flex-1"
                    >
                      {seg.name}
                    </button>
                    <button
                      onClick={() => onDeleteSegment(seg.id)}
                      className="text-[var(--text-tertiary)] hover:text-red-500 ml-2 p-1"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Manage Tags button */}
      {canEdit && (
        <button
          onClick={onManageTags}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-2 py-1.5"
        >
          Manage Tags
        </button>
      )}
    </div>
  );
}
