'use client';

import { useState, useRef, useEffect } from 'react';
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
  onImport: () => void;
  onExport: () => void;
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
  onImport,
  onExport,
}: ClientsHeaderProps) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
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
          <button
            onClick={onImport}
            className="px-3 py-1.5 text-[11px] font-semibold rounded-[10px] border transition-colors"
            style={{
              backgroundColor: 'transparent',
              color: 'var(--accent-primary)',
              borderColor: 'var(--accent-primary)',
            }}
          >
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="hidden sm:inline">Import</span>
            </span>
          </button>
        )}
        {canEdit && (
          <Button variant="primary" onClick={onAddClient}>
            + Add Client
          </Button>
        )}
        {/* Overflow menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1.5 rounded-lg hover:bg-[var(--surface-subtle)] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-[var(--border-default)] bg-[var(--surface-overlay)] shadow-lg z-20 py-1">
              <button
                onClick={() => { setMenuOpen(false); onExport(); }}
                className="w-full text-left px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-raised)] min-h-[40px] flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export as CSV
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
