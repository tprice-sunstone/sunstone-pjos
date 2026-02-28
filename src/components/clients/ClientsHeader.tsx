'use client';

import { Button } from '@/components/ui';
import { toast } from 'sonner';

interface ClientsHeaderProps {
  clientCount: number;
  filteredCount: number;
  isFiltered: boolean;
  waiverLink: string;
  canEdit: boolean;
  onAddClient: () => void;
}

export default function ClientsHeader({
  clientCount,
  filteredCount,
  isFiltered,
  waiverLink,
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
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            navigator.clipboard.writeText(waiverLink);
            toast.success('Waiver link copied');
          }}
        >
          Copy Waiver Link
        </Button>
        {canEdit && (
          <Button variant="primary" onClick={onAddClient}>
            + Add Client
          </Button>
        )}
      </div>
    </div>
  );
}
