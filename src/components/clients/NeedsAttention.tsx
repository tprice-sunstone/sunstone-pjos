'use client';

import { useEffect, useState, useCallback } from 'react';

interface Suggestion {
  client_id: string;
  client_name: string;
  initials: string;
  suggestion: string;
  type: 'lapsed' | 'birthday' | 'new_lead' | 'event_follow_up' | 'workflow';
  workflow_queue_id?: string;
  message_preview?: string;
  template_description?: string;
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
      // Fetch AI suggestions and workflow queue items in parallel
      const [suggestionsRes, workflowRes] = await Promise.all([
        fetch(`/api/clients/suggestions?tenantId=${tenantId}`),
        fetch(`/api/clients/workflow-queue?tenantId=${tenantId}&status=ready`).catch(() => null),
      ]);

      const aiSuggestions: Suggestion[] = suggestionsRes.ok ? await suggestionsRes.json() : [];

      // Add workflow items if available
      let workflowItems: Suggestion[] = [];
      if (workflowRes?.ok) {
        const wfData = await workflowRes.json();
        workflowItems = (wfData.ready || []).map((item: any) => ({
          client_id: item.client_id,
          client_name: item.client_name || 'Client',
          initials: item.client_initials || '??',
          suggestion: item.description || item.template_name,
          type: 'workflow' as const,
          workflow_queue_id: item.id,
          message_preview: item.message_body?.slice(0, 60),
          template_description: item.description,
        }));
      }

      // Merge: workflow items first (they're actionable), then AI suggestions
      const merged = [...workflowItems, ...aiSuggestions];
      // Deduplicate by client_id (keep first occurrence)
      const seen = new Set<string>();
      const deduped: Suggestion[] = [];
      for (const s of merged) {
        const key = s.workflow_queue_id || s.client_id;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(s);
        }
      }
      setSuggestions(deduped.slice(0, 5));
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchSuggestions(); }, [fetchSuggestions]);

  const handleWorkflowAction = async (queueId: string, action: 'send' | 'skip') => {
    try {
      const method = action === 'send' ? 'POST' : 'PATCH';
      const res = await fetch('/api/clients/workflow-queue', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queue_id: queueId }),
      });
      if (res.ok) {
        setSuggestions((prev) => prev.filter((s) => s.workflow_queue_id !== queueId));
      }
    } catch {
      // silent
    }
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold text-[var(--text-secondary)]">
          Needs Your Attention
        </span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          {collapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!collapsed && (
        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
          {suggestions.map((s, i) => (
            <div
              key={s.workflow_queue_id || s.client_id}
              className={`flex items-center gap-3 px-3 py-2.5 ${
                i < suggestions.length - 1 ? 'border-b border-[var(--border-subtle)]' : ''
              }`}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  {s.initials}
                </span>
              </div>

              {/* Name + reason */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{s.client_name}</p>
                <p className="text-[11px] text-[var(--text-secondary)] truncate">
                  {s.type === 'workflow' ? (s.template_description || s.suggestion) : s.suggestion}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {s.type === 'workflow' ? (
                  <>
                    <button
                      onClick={() => handleWorkflowAction(s.workflow_queue_id!, 'send')}
                      className="text-[10px] font-semibold px-3 py-1 rounded-md transition-colors"
                      style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
                    >
                      Send
                    </button>
                    <button
                      onClick={() => handleWorkflowAction(s.workflow_queue_id!, 'skip')}
                      className="text-[10px] font-semibold px-2 py-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                    >
                      Skip
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => onSendMessage(s.client_id)}
                    className="text-[10px] font-semibold px-3 py-1 rounded-md transition-colors"
                    style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}
                  >
                    Reach Out
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
