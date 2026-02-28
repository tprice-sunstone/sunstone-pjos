'use client';

import { Button } from '@/components/ui';

interface ClientsHeaderProps {
  clientCount: number;
  filteredCount: number;
  isFiltered: boolean;
  canEdit: boolean;
  crmEnabled: boolean;
  onAddClient: () => void;
  onBroadcast: () => void;
}

export default function ClientsHeader({
  clientCount,
  filteredCount,
  isFiltered,
  canEdit,
  crmEnabled,
  onAddClient,
  onBroadcast,
}: ClientsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Clients</h1>
        <p className="text-[var(--text-tertiary)] mt-1">
          {isFiltered ? `${filteredCount} of ${clientCount} clients` : `${clientCount} clients`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {crmEnabled && (
          <button
            onClick={onBroadcast}
            className="px-3 py-1.5 text-[11px] font-semibold rounded-[10px] border transition-colors"
            style={{
              backgroundColor: 'var(--accent-muted)',
              color: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)',
            }}
          >
            Broadcast
          </button>
        )}
        {canEdit && (
          <Button variant="primary" onClick={onAddClient}>
            + Add Client
          </Button>
        )}
      </div>
    </div>
  );
}
