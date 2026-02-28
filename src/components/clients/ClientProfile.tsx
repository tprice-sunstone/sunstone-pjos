'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button, Badge } from '@/components/ui';
import { getTagColor } from '@/lib/tag-colors';
import { downloadWaiverPDF } from '@/lib/generate-waiver-pdf';
import { getThemeById } from '@/lib/themes';
import type { Client, ClientTag, Waiver, Sale, SaleItem } from '@/types';
import type { WaiverPDFData } from '@/lib/generate-waiver-pdf';

interface TagWithCount extends ClientTag {
  usage_count: number;
}

interface ClientProfileProps {
  clientId: string;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onTagsChanged: () => void;
}

interface SaleWithItems extends Sale {
  items?: SaleItem[];
}

export default function ClientProfile({ clientId, onClose, onEdit, onTagsChanged }: ClientProfileProps) {
  const { tenant } = useTenant();
  const supabase = createClient();

  const [client, setClient] = useState<Client | null>(null);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [clientTagIds, setClientTagIds] = useState<string[]>([]);
  const [sales, setSales] = useState<SaleWithItems[]>([]);
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);

    // Fetch client, tags, tag assignments, sales, waivers in parallel
    const [clientRes, tagsRes, assignRes, salesRes, waiverRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      fetch(`/api/tags?tenantId=${tenant.id}`).then((r) => r.ok ? r.json() : []),
      supabase.from('client_tag_assignments').select('tag_id').eq('client_id', clientId),
      supabase.from('sales').select('*, items:sale_items(*)').eq('client_id', clientId).eq('status', 'completed').order('created_at', { ascending: false }).limit(20),
      supabase.from('waivers').select('*').eq('client_id', clientId).order('signed_at', { ascending: false }),
    ]);

    if (clientRes.data) setClient(clientRes.data as Client);
    setTags(tagsRes);
    setClientTagIds((assignRes.data || []).map((a: any) => a.tag_id));
    setSales((salesRes.data || []) as SaleWithItems[]);
    setWaivers((waiverRes.data || []) as Waiver[]);
    setLoading(false);
  }, [tenant, clientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleTag = async (tagId: string) => {
    const isAssigned = clientTagIds.includes(tagId);
    if (isAssigned) {
      await fetch(`/api/clients/${clientId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
      setClientTagIds((prev) => prev.filter((id) => id !== tagId));
    } else {
      await fetch(`/api/clients/${clientId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
      setClientTagIds((prev) => [...prev, tagId]);
    }
    onTagsChanged();
  };

  const handleDownloadPDF = async (waiver: Waiver) => {
    if (!tenant || !client) return;
    setDownloadingId(waiver.id);
    try {
      let eventName: string | undefined;
      if (waiver.event_id) {
        const { data: eventData } = await supabase
          .from('events').select('name').eq('id', waiver.event_id).single();
        if (eventData) eventName = eventData.name;
      }
      const themeAccent = tenant.theme_id ? getThemeById(tenant.theme_id).accent : undefined;
      const pdfData: WaiverPDFData = {
        tenantName: tenant.name,
        tenantAccentColor: themeAccent || tenant.brand_color || undefined,
        tenantLogoUrl: tenant.logo_url || undefined,
        clientName: waiver.signer_name,
        clientEmail: waiver.signer_email || undefined,
        clientPhone: client.phone || undefined,
        waiverText: waiver.waiver_text,
        signatureDataUrl: waiver.signature_data,
        signedAt: waiver.signed_at,
        eventName,
      };
      downloadWaiverPDF(pdfData);
      toast.success('PDF downloaded');
    } catch {
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const totalSpent = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalVisits = sales.length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[420px] z-40 bg-[var(--surface-base)] border-l border-[var(--border-default)] transition-transform duration-300 translate-x-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">Loading...</div>
        ) : client ? (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">
                  {client.first_name} {client.last_name}
                </h2>
                <div className="text-sm text-[var(--text-secondary)] mt-1 space-y-0.5">
                  {client.email && <p>{client.email}</p>}
                  {client.phone && <p>{client.phone}</p>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(client)}
                  className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                  </svg>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--surface-subtle)] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[var(--text-primary)]">{totalVisits}</div>
                <div className="text-[10px] text-[var(--text-tertiary)]">Visits</div>
              </div>
              <div className="bg-[var(--surface-subtle)] rounded-lg p-3 text-center">
                <div className="text-lg font-bold text-[var(--text-primary)]">${totalSpent.toFixed(0)}</div>
                <div className="text-[10px] text-[var(--text-tertiary)]">Total Spent</div>
              </div>
              <div className="bg-[var(--surface-subtle)] rounded-lg p-3 text-center">
                <div className="text-xs font-medium text-[var(--text-primary)]">
                  {client.last_visit_at ? format(new Date(client.last_visit_at), 'MMM d') : '-'}
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)]">Last Visit</div>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Tags</h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {clientTagIds.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  const colors = getTagColor(tag.color);
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {tag.name}
                      <button onClick={() => toggleTag(tag.id)} className="hover:opacity-70">&times;</button>
                    </span>
                  );
                })}
                <div className="relative">
                  <button
                    onClick={() => setShowTagDropdown(!showTagDropdown)}
                    className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] px-1.5 py-0.5 border border-dashed border-[var(--border-default)] rounded-full"
                  >
                    + tag
                  </button>
                  {showTagDropdown && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowTagDropdown(false)} />
                      <div className="absolute left-0 top-full mt-1 bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                        {tags.map((tag) => {
                          const isAssigned = clientTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleTag(tag.id)}
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
              </div>
            </div>

            {/* Member since + birthday */}
            <div className="text-xs text-[var(--text-tertiary)] space-y-1">
              <p>Member since {format(new Date(client.created_at), 'MMM d, yyyy')}</p>
              {client.birthday && <p>Birthday: {format(new Date(client.birthday + 'T00:00:00'), 'MMM d')}</p>}
            </div>

            {/* Visit History */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Visit History ({sales.length})
              </h3>
              {sales.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">No visits yet.</p>
              ) : (
                <div className="space-y-2">
                  {sales.map((sale) => (
                    <div key={sale.id} className="border border-[var(--border-default)] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--text-primary)]">
                          ${Number(sale.total).toFixed(2)}
                        </span>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {format(new Date(sale.created_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                      {sale.items && sale.items.length > 0 && (
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          {sale.items.map((i) => i.name).join(', ')}
                        </p>
                      )}
                      <span className="text-[10px] text-[var(--text-tertiary)]">
                        {sale.payment_method?.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waivers */}
            <div>
              <h3 className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Waivers ({waivers.length})
              </h3>
              {waivers.length === 0 ? (
                <p className="text-xs text-[var(--text-tertiary)]">No waivers signed yet.</p>
              ) : (
                <div className="space-y-2">
                  {waivers.map((waiver) => (
                    <div key={waiver.id} className="border border-[var(--border-default)] rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="success">Signed</Badge>
                        <span className="text-[10px] text-[var(--text-tertiary)]">
                          {format(new Date(waiver.signed_at), 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)]">{waiver.signer_name}</p>
                      <div className="mt-2 flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleDownloadPDF(waiver)}
                          disabled={downloadingId === waiver.id}
                        >
                          {downloadingId === waiver.id ? 'Generating...' : 'Download PDF'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">Client not found</div>
        )}
      </div>
    </>
  );
}
