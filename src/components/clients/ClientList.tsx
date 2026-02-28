'use client';

import { useState } from 'react';
import { Button, Card, CardContent } from '@/components/ui';
import ClientCard from './ClientCard';
import type { Client, ClientTag } from '@/types';

interface TagWithCount extends ClientTag {
  usage_count: number;
}

type SortField = 'name' | 'last_visit' | 'created';

type ClientTagMap = Record<string, string[]>;

interface ClientListProps {
  clients: Client[];
  loading: boolean;
  isStarter: boolean;
  canEdit: boolean;
  tags: TagWithCount[];
  clientTagMap: ClientTagMap;
  selectedClientIds: Set<string>;
  tagDropdownClientId: string | null;
  hasFilters: boolean;
  onToggleSelect: (clientId: string) => void;
  onClearSelection: () => void;
  onBulkAssignTag: (tagId: string) => void;
  onSetTagDropdown: (clientId: string | null) => void;
  onToggleClientTag: (clientId: string, tagId: string) => void;
  onOpenProfile: (client: Client) => void;
  onAddClient: () => void;
}

export default function ClientList({
  clients,
  loading,
  isStarter,
  canEdit,
  tags,
  clientTagMap,
  selectedClientIds,
  tagDropdownClientId,
  hasFilters,
  onToggleSelect,
  onClearSelection,
  onBulkAssignTag,
  onSetTagDropdown,
  onToggleClientTag,
  onOpenProfile,
  onAddClient,
}: ClientListProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [showBulkTagDropdown, setShowBulkTagDropdown] = useState(false);

  const getTag = (id: string) => tags.find((t) => t.id === id);

  const sortedClients = [...clients].sort((a, b) => {
    let cmp = 0;
    if (sortField === 'name') {
      const nameA = `${a.first_name || ''} ${a.last_name || ''}`.toLowerCase();
      const nameB = `${b.first_name || ''} ${b.last_name || ''}`.toLowerCase();
      cmp = nameA.localeCompare(nameB);
    } else if (sortField === 'last_visit') {
      const dateA = a.last_visit_at ? new Date(a.last_visit_at).getTime() : 0;
      const dateB = b.last_visit_at ? new Date(b.last_visit_at).getTime() : 0;
      cmp = dateA - dateB;
    } else {
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    return sortAsc ? cmp : -cmp;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (loading) {
    return <div className="text-[var(--text-tertiary)] py-12 text-center">Loading...</div>;
  }

  if (clients.length === 0) {
    return (
      <Card padding="lg">
        <CardContent>
          <div className="text-center py-8">
            <p className="text-[var(--text-tertiary)] mb-4">
              {hasFilters ? 'No clients found' : 'No clients yet'}
            </p>
            {!hasFilters && canEdit && (
              <Button variant="primary" onClick={onAddClient}>
                Add Your First Client
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions bar */}
      {!isStarter && selectedClientIds.size > 0 && (
        <div className="flex items-center gap-3 bg-[var(--surface-subtle)] border border-[var(--border-default)] rounded-xl px-4 py-3">
          <span className="text-sm text-[var(--text-secondary)]">{selectedClientIds.size} selected</span>
          <div className="relative">
            <Button variant="secondary" size="sm" onClick={() => setShowBulkTagDropdown(!showBulkTagDropdown)}>
              Add Tag
            </Button>
            {showBulkTagDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowBulkTagDropdown(false)} />
                <div className="absolute left-0 top-full mt-1 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => { onBulkAssignTag(tag.id); setShowBulkTagDropdown(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-[var(--surface-subtle)]"
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                      {tag.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onClearSelection}
            className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-auto"
          >
            Deselect all
          </button>
        </div>
      )}

      {/* Sort controls */}
      <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
        <span>Sort by:</span>
        {([
          { field: 'name' as SortField, label: 'Name' },
          { field: 'last_visit' as SortField, label: 'Last Visit' },
          { field: 'created' as SortField, label: 'Date Added' },
        ]).map(({ field, label }) => (
          <button
            key={field}
            onClick={() => handleSort(field)}
            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
              sortField === field
                ? 'text-[var(--text-primary)] bg-[var(--surface-subtle)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {label}
            {sortField === field && (
              <span className="ml-0.5">{sortAsc ? '\u2191' : '\u2193'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Client cards */}
      <div className="grid gap-2">
        {sortedClients.map((client) => {
          const clientTagIds = clientTagMap[client.id] || [];
          const clientTags = clientTagIds.map(getTag).filter(Boolean) as TagWithCount[];
          return (
            <ClientCard
              key={client.id}
              client={client}
              clientTags={clientTags}
              isStarter={isStarter}
              canEdit={canEdit}
              isSelected={selectedClientIds.has(client.id)}
              allTags={tags}
              clientTagIds={clientTagIds}
              showTagDropdown={tagDropdownClientId === client.id}
              onSelect={() => onToggleSelect(client.id)}
              onToggleTagDropdown={() => onSetTagDropdown(tagDropdownClientId === client.id ? null : client.id)}
              onToggleClientTag={(tagId) => onToggleClientTag(client.id, tagId)}
              onOpenProfile={() => onOpenProfile(client)}
            />
          );
        })}
      </div>
    </div>
  );
}
