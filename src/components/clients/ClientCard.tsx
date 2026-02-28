'use client';

import { getTagColor } from '@/lib/tag-colors';
import { Button } from '@/components/ui';
import type { Client, ClientTag } from '@/types';

interface TagWithCount extends ClientTag {
  usage_count: number;
}

interface ClientCardProps {
  client: Client;
  clientTags: TagWithCount[];
  isStarter: boolean;
  canEdit: boolean;
  isSelected: boolean;
  allTags: TagWithCount[];
  clientTagIds: string[];
  showTagDropdown: boolean;
  onSelect: () => void;
  onToggleTagDropdown: () => void;
  onToggleClientTag: (tagId: string) => void;
  onOpenProfile: () => void;
}

export default function ClientCard({
  client,
  clientTags,
  isStarter,
  canEdit,
  isSelected,
  allTags,
  clientTagIds,
  showTagDropdown,
  onSelect,
  onToggleTagDropdown,
  onToggleClientTag,
  onOpenProfile,
}: ClientCardProps) {
  return (
    <div
      className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4 hover:border-[var(--border-subtle)] transition-colors cursor-pointer"
      onClick={onOpenProfile}
    >
      <div className="flex items-center gap-3">
        {/* Bulk select checkbox (Pro/Business) */}
        {!isStarter && canEdit && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => { e.stopPropagation(); onSelect(); }}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 rounded border-[var(--border-default)] accent-[var(--accent-primary)] cursor-pointer flex-shrink-0"
          />
        )}

        {/* Avatar initials */}
        <div className="w-9 h-9 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            {(client.first_name?.[0] || '').toUpperCase()}{(client.last_name?.[0] || '').toUpperCase()}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-[var(--text-primary)]">
              {client.first_name} {client.last_name}
            </span>
            {/* Tag badges */}
            {!isStarter && clientTags.map((tag) => {
              const colors = getTagColor(tag.color);
              return (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                  style={{ backgroundColor: colors.bg, color: colors.text }}
                >
                  {tag.name}
                </span>
              );
            })}
          </div>
          <div className="text-sm text-[var(--text-secondary)] mt-0.5">
            {client.email && <span>{client.email}</span>}
            {client.email && client.phone && <span> · </span>}
            {client.phone && <span>{client.phone}</span>}
            {client.last_visit_at && (
              <>
                <span> · </span>
                <span className="text-[var(--text-tertiary)]">
                  Last visit {new Date(client.last_visit_at).toLocaleDateString()}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Tag dropdown for this client */}
          {!isStarter && canEdit && (
            <div className="relative">
              <Button variant="ghost" size="sm" onClick={onToggleTagDropdown}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </Button>
              {showTagDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={onToggleTagDropdown} />
                  <div className="absolute right-0 top-full mt-1 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                    {allTags.map((tag) => {
                      const isAssigned = clientTagIds.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          onClick={() => onToggleClientTag(tag.id)}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-subtle)]"
                        >
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                          <span className="flex-1">{tag.name}</span>
                          {isAssigned && (
                            <svg className="w-4 h-4 text-[var(--accent-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
