'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Client } from '@/types';

interface Suggestion {
  client_id: string;
  client_name: string;
  initials: string;
  suggestion: string;
  type: 'lapsed' | 'birthday' | 'new_lead' | 'event_follow_up';
}

interface NeedsAttentionProps {
  tenantId: string;
  onOpenProfile: (clientId: string) => void;
  onSendMessage: (clientId: string) => void;
}

export default function NeedsAttention({ tenantId, onOpenProfile, onSendMessage }: NeedsAttentionProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/suggestions?tenantId=${tenantId}`);
      if (res.ok) setSuggestions(await res.json());
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  if (loading || suggestions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Needs Your Attention</h2>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!collapsed && (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {suggestions.map((s) => (
            <div
              key={s.client_id}
              className="flex-shrink-0 w-[220px] bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4 space-y-3"
            >
              {/* Avatar + name */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">{s.initials}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{s.client_name}</p>
                </div>
              </div>

              {/* Suggestion text */}
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{s.suggestion}</p>

              {/* Quick actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onOpenProfile(s.client_id)}
                  className="flex-1 text-[10px] font-medium py-1.5 rounded-lg bg-[var(--surface-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => onSendMessage(s.client_id)}
                  className="flex-1 text-[10px] font-medium py-1.5 rounded-lg text-white transition-colors"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
