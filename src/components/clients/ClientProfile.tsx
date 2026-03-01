'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui';
import { getTagColor } from '@/lib/tag-colors';
import { downloadWaiverPDF } from '@/lib/generate-waiver-pdf';
import { getThemeById } from '@/lib/themes';
import type { Client, ClientTag, Waiver, Sale, SaleItem } from '@/types';
import type { WaiverPDFData } from '@/lib/generate-waiver-pdf';
import ComposeModal from './ComposeModal';

interface TagWithCount extends ClientTag {
  usage_count: number;
}

interface ClientProfileProps {
  clientId: string;
  tenantId: string;
  onClose: () => void;
  onEdit: (client: Client) => void;
  onTagsChanged: () => void;
}

interface SaleWithItems extends Sale {
  items?: SaleItem[];
  event?: { name: string } | null;
}

export default function ClientProfile({ clientId, tenantId, onClose, onEdit, onTagsChanged }: ClientProfileProps) {
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
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [composeChannel, setComposeChannel] = useState<'sms' | 'email' | null>(null);

  const fetchData = useCallback(async () => {
    if (!tenant) return;
    setLoading(true);

    const [clientRes, tagsRes, assignRes, salesRes, waiverRes, suggestionsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      fetch(`/api/tags?tenantId=${tenant.id}`).then((r) => r.ok ? r.json() : []),
      supabase.from('client_tag_assignments').select('tag_id').eq('client_id', clientId),
      supabase.from('sales').select('*, items:sale_items(*), event:events(name)').eq('client_id', clientId).eq('status', 'completed').order('created_at', { ascending: false }).limit(20),
      supabase.from('waivers').select('*').eq('client_id', clientId).order('signed_at', { ascending: false }),
      fetch(`/api/clients/suggestions?tenantId=${tenant.id}`).then((r) => r.ok ? r.json() : []),
    ]);

    if (clientRes.data) setClient(clientRes.data as Client);
    setTags(tagsRes);
    setClientTagIds((assignRes.data || []).map((a: any) => a.tag_id));
    setSales((salesRes.data || []) as SaleWithItems[]);
    setWaivers((waiverRes.data || []) as Waiver[]);

    // Check if this client has a suggestion
    const clientSuggestion = (suggestionsRes || []).find((s: any) => s.client_id === clientId);
    if (clientSuggestion) setSuggestion(clientSuggestion.suggestion);

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
  const totalPieces = sales.reduce((sum, s) => sum + (s.items?.length || 0), 0);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full md:w-[420px] z-40 bg-[var(--surface-base)] border-l border-[var(--border-default)] transition-transform duration-300 translate-x-0 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin h-6 w-6 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : client ? (
          <div className="p-5 space-y-5">
            {/* Top nav row */}
            <div className="flex items-center justify-between">
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-subtle)]"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Centered avatar + name + tags + contact */}
            <div className="text-center space-y-2">
              <div
                className="w-14 h-14 rounded-full mx-auto flex items-center justify-center"
                style={{ backgroundColor: 'var(--accent-muted)' }}
              >
                <span className="text-lg font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  {(client.first_name?.[0] || '').toUpperCase()}{(client.last_name?.[0] || '').toUpperCase()}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {client.first_name} {client.last_name}
              </h2>
              {/* Tags */}
              <div className="flex items-center justify-center gap-1 flex-wrap">
                {clientTagIds.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  const colors = getTagColor(tag.color);
                  return (
                    <span
                      key={tag.id}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold"
                      style={{ backgroundColor: colors.bg, color: colors.text }}
                    >
                      {tag.name}
                    </span>
                  );
                })}
              </div>
              {/* Contact */}
              <div className="text-[11px] text-[var(--text-secondary)] space-y-0.5">
                {client.phone && <p>{client.phone}</p>}
                {client.email && <p>{client.email}</p>}
              </div>
            </div>

            {/* Quick action buttons — 4 in a row */}
            <div className="grid grid-cols-4 gap-2">
              {[
                {
                  label: 'Text',
                  icon: MessageSquareIcon,
                  onClick: () => {
                    if (client.phone) {
                      setComposeChannel('sms');
                    } else {
                      toast.error('No phone number on file');
                    }
                  },
                },
                {
                  label: 'Email',
                  icon: MailIcon,
                  onClick: () => {
                    if (client.email) {
                      setComposeChannel('email');
                    } else {
                      toast.error('No email on file');
                    }
                  },
                },
                { label: 'Tag', icon: TagIcon, onClick: () => setShowTagDropdown(!showTagDropdown) },
                { label: 'Waiver', icon: FileTextIcon, onClick: () => setShowWaiverModal(true) },
              ].map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="flex flex-col items-center justify-center gap-1 py-2 border border-[var(--border-default)] rounded-xl hover:bg-[var(--surface-subtle)] transition-colors"
                  style={{ minHeight: 44 }}
                >
                  <Icon className="w-4 h-4 text-[var(--text-secondary)]" />
                  <span className="text-[9px] font-semibold text-[var(--text-secondary)]">{label}</span>
                </button>
              ))}
            </div>

            {/* Tag dropdown */}
            {showTagDropdown && (
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-2 space-y-0.5">
                {tags.map((tag) => {
                  const isAssigned = clientTagIds.includes(tag.id);
                  const colors = getTagColor(tag.color);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-left rounded-lg hover:bg-[var(--surface-subtle)]"
                    >
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.text }} />
                      <span className="flex-1 text-[var(--text-primary)]">{tag.name}</span>
                      {isAssigned && (
                        <svg className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Stats row */}
            <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-base font-bold text-[var(--text-primary)]">${totalSpent.toFixed(0)}</div>
                  <div className="text-[9px] text-[var(--text-tertiary)]">Total Spent</div>
                </div>
                <div>
                  <div className="text-base font-bold text-[var(--text-primary)]">{totalPieces}</div>
                  <div className="text-[9px] text-[var(--text-tertiary)]">Pieces</div>
                </div>
                <div>
                  <div className="text-base font-bold text-[var(--text-primary)]">
                    {client.last_visit_at ? format(new Date(client.last_visit_at), 'MMM d') : '--'}
                  </div>
                  <div className="text-[9px] text-[var(--text-tertiary)]">Last Visit</div>
                </div>
              </div>
            </div>

            {/* AI Suggested Action */}
            {suggestion && (
              <div
                className="rounded-xl p-3"
                style={{
                  backgroundColor: 'var(--accent-muted)',
                  borderLeft: '3px solid var(--accent-primary)',
                }}
              >
                <div className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--accent-primary)' }}>
                  Suggested Action
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mb-2">{suggestion}</p>
                <button
                  onClick={() => setComposeChannel(client.phone ? 'sms' : client.email ? 'email' : null)}
                  className="text-[10px] font-semibold px-3 py-1 rounded-md text-white"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  Send Message
                </button>
              </div>
            )}

            {/* Member since + birthday */}
            <div className="text-[11px] text-[var(--text-tertiary)] space-y-1">
              <p>Member since {format(new Date(client.created_at), 'MMM d, yyyy')}</p>
              {client.birthday && <p>Birthday: {format(new Date(client.birthday + 'T00:00:00'), 'MMM d')}</p>}
            </div>

            {/* Visit History */}
            <div>
              <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                Visit History
              </div>
              {sales.length === 0 ? (
                <p className="text-[11px] text-[var(--text-tertiary)]">No visits yet.</p>
              ) : (
                <div className="space-y-0">
                  {sales.map((sale) => (
                    <div key={sale.id} className="flex gap-2 py-2">
                      {/* Vertical accent bar */}
                      <div className="w-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--accent-200)' }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium text-[var(--text-primary)]">
                            {format(new Date(sale.created_at), 'MMM d, yyyy')}
                          </span>
                          <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                            ${Number(sale.total).toFixed(2)}
                          </span>
                        </div>
                        {sale.event?.name && (
                          <p className="text-[10px] text-[var(--text-secondary)]">{sale.event.name}</p>
                        )}
                        {sale.items && sale.items.length > 0 && (
                          <p className="text-[10px] text-[var(--text-tertiary)]">
                            {sale.items.map((i) => i.name).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Waivers */}
            {waivers.length > 0 && (
              <div>
                <div className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
                  Waivers
                </div>
                <div className="space-y-1.5">
                  {waivers.map((waiver) => (
                    <div key={waiver.id} className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)]">
                      <div>
                        <p className="text-[11px] text-[var(--text-primary)]">{waiver.signer_name}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)]">
                          {format(new Date(waiver.signed_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadPDF(waiver)}
                        disabled={downloadingId === waiver.id}
                      >
                        {downloadingId === waiver.id ? '...' : 'PDF'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Waiver status modal */}
            {showWaiverModal && (
              <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Waiver Status</h3>
                  <button
                    onClick={() => setShowWaiverModal(false)}
                    className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {waivers.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success-500" />
                      <span className="text-xs text-[var(--text-primary)]">
                        Signed on {format(new Date(waivers[0].signed_at), 'MMM d, yyyy')}
                      </span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownloadPDF(waivers[0])}
                      disabled={downloadingId === waivers[0].id}
                    >
                      {downloadingId === waivers[0].id ? 'Generating...' : 'View Waiver PDF'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-[var(--text-tertiary)]">No signed waiver on file.</p>
                    <button
                      onClick={() => {
                        if (client.phone) {
                          setComposeChannel('sms');
                        } else if (client.email) {
                          setComposeChannel('email');
                        } else {
                          toast.error('No phone or email on file');
                        }
                        setShowWaiverModal(false);
                      }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      Send Waiver Link
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Edit button */}
            <div className="pt-2">
              <button
                onClick={() => onEdit(client)}
                className="w-full text-center text-xs font-semibold py-2.5 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] transition-colors"
              >
                Edit Client
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[var(--text-tertiary)]">Client not found</div>
        )}
      </div>

      {/* Compose Modal */}
      {composeChannel && client && tenant && (
        <ComposeModal
          channel={composeChannel}
          clientId={clientId}
          clientName={`${client.first_name || ''} ${client.last_name || ''}`.trim()}
          tenantId={tenantId}
          tenantName={tenant.name}
          onClose={() => setComposeChannel(null)}
          onSent={() => setComposeChannel(null)}
        />
      )}
    </>
  );
}

// ── Lucide-style icons (no emojis) ────────────────────────────────────────

function MessageSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function FileTextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}
