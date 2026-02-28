'use client';

import { Button } from '@/components/ui';

interface ClientsHeaderProps {
  clientCount: number;
  filteredCount: number;
  isFiltered: boolean;
  canEdit: boolean;
  onAddClient: () => void;
}

export default function ClientsHeader({
  clientCount,
  filteredCount,
  isFiltered,
  canEdit,
  onAddClient,
}: ClientsHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Clients</h1>
        <p className="text-[var(--text-tertiary)] mt-1">
          {isFiltered ? `${filteredCount} of ${clientCount} clients` : `${clientCount} clients`}
        </p>
      </div>
      {canEdit && (
        <Button variant="primary" onClick={onAddClient}>
          + Add Client
        </Button>
      )}
    </div>
  );
}
