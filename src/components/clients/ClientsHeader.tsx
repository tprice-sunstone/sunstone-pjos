'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { toast } from 'sonner';

interface ClientsHeaderProps {
  clientCount: number;
  filteredCount: number;
  isFiltered: boolean;
  canEdit: boolean;
  crmEnabled: boolean;
  tenantSlug: string | null;
  onAddClient: () => void;
  onBroadcast: () => void;
}

export default function ClientsHeader({
  clientCount,
  filteredCount,
  isFiltered,
  canEdit,
  crmEnabled,
  tenantSlug,
  onAddClient,
  onBroadcast,
}: ClientsHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyWaiverLink = async () => {
    if (!tenantSlug) return;
    const url = `${window.location.origin}/waiver?tenant=${tenantSlug}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Waiver link copied!');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Clients</h1>
        <p className="text-[var(--text-tertiary)] mt-1">
          {isFiltered ? `${filteredCount} of ${clientCount} clients` : `${clientCount} clients`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {tenantSlug && (
          <button
            onClick={copyWaiverLink}
            className="px-3 py-1.5 text-[11px] font-semibold rounded-[10px] border transition-colors"
            style={{
              backgroundColor: copied ? 'var(--accent-muted)' : 'transparent',
              color: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)',
            }}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {copied ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.314a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.25 8.018" />
                )}
              </svg>
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Waiver Link'}</span>
            </span>
          </button>
        )}
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
            CRM
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
