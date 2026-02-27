'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { downloadWaiverPDF } from '@/lib/generate-waiver-pdf';
import type { WaiverPDFData } from '@/lib/generate-waiver-pdf';
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui';
import type { Client, Waiver, ClientTag, ClientSegment } from '@/types';
import UpgradePrompt from '@/components/ui/UpgradePrompt';

// ── Preset tag colors ─────────────────────────────────────────────────────
const TAG_COLORS = [
  { hex: '#64748B', label: 'Slate' },
  { hex: '#DC2626', label: 'Red' },
  { hex: '#EA580C', label: 'Orange' },
  { hex: '#D97706', label: 'Amber' },
  { hex: '#059669', label: 'Green' },
  { hex: '#0D9488', label: 'Teal' },
  { hex: '#2563EB', label: 'Blue' },
  { hex: '#7C3AED', label: 'Purple' },
  { hex: '#EC4899', label: 'Pink' },
];

// ── Tag with usage count (from API) ──────────────────────────────────────
interface TagWithCount extends ClientTag {
  usage_count: number;
}

// ── Client with tags map (client-side join) ──────────────────────────────
type ClientTagMap = Record<string, string[]>; // client_id → tag_id[]

export default function ClientsPage() {
  const { tenant, can } = useTenant();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const supabase = createClient();

  // Tag state
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [clientTagMap, setClientTagMap] = useState<ClientTagMap>({});
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [tagDropdownClientId, setTagDropdownClientId] = useState<string | null>(null);

  // Segment state
  const [segments, setSegments] = useState<ClientSegment[]>([]);
  const [showSegmentDropdown, setShowSegmentDropdown] = useState(false);
  const [savingSegment, setSavingSegment] = useState(false);
  const [activeSegment, setActiveSegment] = useState<ClientSegment | null>(null);

  // Bulk selection
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());
  const [showBulkTagDropdown, setShowBulkTagDropdown] = useState(false);

  // Subscription gating — CRM teaser for Starter
  const isStarter = (() => {
    if (!tenant) return true;
    if (tenant.subscription_status === 'active' && (tenant.subscription_tier === 'pro' || tenant.subscription_tier === 'business')) return false;
    if (tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date()) return false;
    return true;
  })();

  // ── Fetch clients ───────────────────────────────────────────────────────
  const fetchClients = useCallback(async () => {
    if (!tenant) return;
    let query = supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    const { data } = await query;
    setClients((data || []) as Client[]);
    setLoading(false);
  }, [tenant, search]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── Fetch tags (Pro/Business only) ──────────────────────────────────────
  const fetchTags = useCallback(async () => {
    if (!tenant || isStarter) return;
    const res = await fetch(`/api/tags?tenantId=${tenant.id}`);
    if (res.ok) {
      const data = await res.json();
      setTags(data);
    }
  }, [tenant, isStarter]);

  // ── Fetch all tag assignments ───────────────────────────────────────────
  const fetchTagAssignments = useCallback(async () => {
    if (!tenant || isStarter) return;
    const { data } = await supabase
      .from('client_tag_assignments')
      .select('client_id, tag_id')
      .in('client_id', clients.map((c) => c.id));

    const map: ClientTagMap = {};
    for (const a of data || []) {
      if (!map[a.client_id]) map[a.client_id] = [];
      map[a.client_id].push(a.tag_id);
    }
    setClientTagMap(map);
  }, [tenant, isStarter, clients]);

  // ── Fetch segments ──────────────────────────────────────────────────────
  const fetchSegments = useCallback(async () => {
    if (!tenant || isStarter) return;
    const res = await fetch(`/api/segments?tenantId=${tenant.id}`);
    if (res.ok) {
      setSegments(await res.json());
    }
  }, [tenant, isStarter]);

  useEffect(() => {
    fetchTags();
    fetchSegments();
  }, [fetchTags, fetchSegments]);

  useEffect(() => {
    if (clients.length > 0) fetchTagAssignments();
  }, [clients, fetchTagAssignments]);

  // ── Tag filtering (AND logic) ───────────────────────────────────────────
  const filteredClients = selectedTagIds.length > 0
    ? clients.filter((c) => {
        const clientTags = clientTagMap[c.id] || [];
        return selectedTagIds.every((tagId) => clientTags.includes(tagId));
      })
    : clients;

  // ── Toggle tag filter ───────────────────────────────────────────────────
  const toggleTagFilter = (tagId: string) => {
    setActiveSegment(null);
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // ── Apply segment ───────────────────────────────────────────────────────
  const applySegment = (segment: ClientSegment) => {
    const tagIds: string[] = segment.filter_criteria?.tagIds || [];
    setSelectedTagIds(tagIds);
    setActiveSegment(segment);
    setShowSegmentDropdown(false);
  };

  // ── Save segment ────────────────────────────────────────────────────────
  const saveAsSegment = async () => {
    if (!tenant || selectedTagIds.length === 0) return;
    const name = prompt('Segment name:');
    if (!name) return;
    setSavingSegment(true);
    const res = await fetch('/api/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.id,
        name,
        filter_criteria: { tagIds: selectedTagIds },
      }),
    });
    setSavingSegment(false);
    if (res.ok) {
      toast.success('Segment saved');
      fetchSegments();
    } else {
      toast.error('Failed to save segment');
    }
  };

  // ── Delete segment ──────────────────────────────────────────────────────
  const deleteSegment = async (id: string) => {
    const res = await fetch(`/api/segments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Segment deleted');
      if (activeSegment?.id === id) {
        setActiveSegment(null);
        setSelectedTagIds([]);
      }
      fetchSegments();
    }
  };

  // ── Assign / remove tag on a client ─────────────────────────────────────
  const toggleClientTag = async (clientId: string, tagId: string) => {
    const assigned = (clientTagMap[clientId] || []).includes(tagId);
    if (assigned) {
      await fetch(`/api/clients/${clientId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
    } else {
      await fetch(`/api/clients/${clientId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
    }
    // Optimistic update
    setClientTagMap((prev) => {
      const current = prev[clientId] || [];
      return {
        ...prev,
        [clientId]: assigned
          ? current.filter((id) => id !== tagId)
          : [...current, tagId],
      };
    });
    fetchTags(); // refresh counts
  };

  // ── Bulk tag ────────────────────────────────────────────────────────────
  const bulkAssignTag = async (tagId: string) => {
    const promises = Array.from(selectedClientIds).map((clientId) => {
      if ((clientTagMap[clientId] || []).includes(tagId)) return Promise.resolve();
      return fetch(`/api/clients/${clientId}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
    });
    await Promise.all(promises);
    toast.success(`Tagged ${selectedClientIds.size} clients`);
    setSelectedClientIds(new Set());
    setShowBulkTagDropdown(false);
    fetchTagAssignments();
    fetchTags();
  };

  // ── Client actions ──────────────────────────────────────────────────────
  const viewClientWaivers = async (client: Client) => {
    setSelectedClient(client);
    const { data } = await supabase
      .from('waivers')
      .select('*')
      .eq('client_id', client.id)
      .order('signed_at', { ascending: false });
    setWaivers((data || []) as Waiver[]);
  };

  const handleAddClient = async (data: Partial<Client>) => {
    if (!tenant) return;
    const { error } = await supabase
      .from('clients')
      .insert({ ...data, tenant_id: tenant.id });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Client added');
    setShowForm(false);
    fetchClients();
  };

  const handleDownloadPDF = async (waiver: Waiver) => {
    if (!tenant) return;
    setDownloadingId(waiver.id);
    try {
      let eventName: string | undefined;
      if (waiver.event_id) {
        const { data: eventData } = await supabase
          .from('events')
          .select('name')
          .eq('id', waiver.event_id)
          .single();
        if (eventData) eventName = eventData.name;
      }

      const pdfData: WaiverPDFData = {
        tenantName: tenant.name,
        tenantAccentColor: tenant.brand_color || undefined,
        clientName: waiver.signer_name,
        clientEmail: waiver.signer_email || undefined,
        clientPhone: selectedClient?.phone || undefined,
        waiverText: waiver.waiver_text,
        signatureDataUrl: waiver.signature_data,
        signedAt: waiver.signed_at,
        eventName,
      };

      downloadWaiverPDF(pdfData);
      toast.success('PDF downloaded');
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const waiverUrl = tenant
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/waiver?tenant=${tenant.slug}`
    : '';

  // ── Helper: get tag by ID ──────────────────────────────────────────────
  const getTag = (id: string) => tags.find((t) => t.id === id);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Clients</h1>
          <p className="text-text-tertiary mt-1">
            {selectedTagIds.length > 0
              ? `${filteredClients.length} of ${clients.length} clients`
              : `${clients.length} clients`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(waiverUrl);
              toast.success('Waiver link copied');
            }}
          >
            📋 Copy Waiver Link
          </Button>
          {can('clients:edit') && (
            <Button variant="primary" onClick={() => setShowForm(true)}>
              + Add Client
            </Button>
          )}
        </div>
      </div>

      {/* Search + Tag Filter Bar (Pro/Business) */}
      <div className="space-y-3">
        <div className="max-w-md">
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Tag filter bar */}
        {!isStarter && tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTagFilter(tag.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={{
                  backgroundColor: selectedTagIds.includes(tag.id) ? tag.color : `${tag.color}18`,
                  color: selectedTagIds.includes(tag.id) ? '#fff' : tag.color,
                  border: `1px solid ${selectedTagIds.includes(tag.id) ? tag.color : `${tag.color}30`}`,
                }}
              >
                {tag.name}
                <span className="opacity-60">{tag.usage_count}</span>
              </button>
            ))}

            {selectedTagIds.length > 0 && (
              <>
                <button
                  onClick={() => { setSelectedTagIds([]); setActiveSegment(null); }}
                  className="text-xs text-text-tertiary hover:text-text-primary px-2 py-1.5"
                >
                  Clear filters
                </button>
                <button
                  onClick={saveAsSegment}
                  disabled={savingSegment}
                  className="text-xs text-[var(--accent-primary)] hover:underline px-2 py-1.5"
                >
                  {savingSegment ? 'Saving…' : 'Save as Segment'}
                </button>
              </>
            )}

            {/* Segments dropdown */}
            {segments.length > 0 && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setShowSegmentDropdown(!showSegmentDropdown)}
                  className="inline-flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg border border-border-default"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  {activeSegment ? activeSegment.name : 'Segments'}
                </button>
                {showSegmentDropdown && (
                  <div className="absolute right-0 top-full mt-1 bg-surface-raised border border-border-default rounded-xl shadow-lg z-20 min-w-[200px] py-1">
                    {segments.map((seg) => (
                      <div key={seg.id} className="flex items-center justify-between px-3 py-2 hover:bg-surface-subtle">
                        <button
                          onClick={() => applySegment(seg)}
                          className="text-sm text-text-primary text-left flex-1"
                        >
                          {seg.name}
                        </button>
                        <button
                          onClick={() => deleteSegment(seg.id)}
                          className="text-text-tertiary hover:text-red-500 ml-2 p-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Manage Tags button */}
            {can('clients:edit') && (
              <button
                onClick={() => setShowTagManager(true)}
                className="text-xs text-text-tertiary hover:text-text-primary px-2 py-1.5"
              >
                Manage Tags
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bulk actions bar */}
      {!isStarter && selectedClientIds.size > 0 && (
        <div className="flex items-center gap-3 bg-surface-subtle border border-border-default rounded-xl px-4 py-3">
          <span className="text-sm text-text-secondary">{selectedClientIds.size} selected</span>
          <div className="relative">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBulkTagDropdown(!showBulkTagDropdown)}
            >
              Add Tag
            </Button>
            {showBulkTagDropdown && (
              <div className="absolute left-0 top-full mt-1 bg-surface-raised border border-border-default rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => bulkAssignTag(tag.id)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-surface-subtle"
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setSelectedClientIds(new Set())}
            className="text-xs text-text-tertiary hover:text-text-primary ml-auto"
          >
            Deselect all
          </button>
        </div>
      )}

      {/* Client List */}
      {loading ? (
        <div className="text-text-tertiary py-12 text-center">Loading…</div>
      ) : filteredClients.length === 0 ? (
        <Card padding="lg">
          <CardContent>
            <div className="text-center py-8">
              <p className="text-text-tertiary mb-4">
                {search || selectedTagIds.length > 0 ? 'No clients found' : 'No clients yet'}
              </p>
              {!search && selectedTagIds.length === 0 && can('clients:edit') && (
                <Button variant="primary" onClick={() => setShowForm(true)}>
                  Add Your First Client
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredClients.map((client) => {
            const clientTags = (clientTagMap[client.id] || []).map(getTag).filter(Boolean) as TagWithCount[];
            const isSelected = selectedClientIds.has(client.id);

            return (
              <Card key={client.id} variant="interactive" padding="md">
                <div className="flex items-center gap-3">
                  {/* Bulk select checkbox (Pro/Business) */}
                  {!isStarter && can('clients:edit') && (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedClientIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(client.id)) next.delete(client.id);
                          else next.add(client.id);
                          return next;
                        });
                      }}
                      className="w-4 h-4 rounded border-border-default accent-[var(--accent-primary)] cursor-pointer flex-shrink-0"
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-text-primary">
                        {client.first_name} {client.last_name}
                      </span>
                      {/* Tag badges */}
                      {!isStarter && clientTags.map((tag) => (
                        <span
                          key={tag.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: `${tag.color}18`,
                            color: tag.color,
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                    <div className="text-sm text-text-secondary mt-0.5">
                      {client.email && <span>{client.email}</span>}
                      {client.email && client.phone && <span> · </span>}
                      {client.phone && <span>{client.phone}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Tag dropdown for this client */}
                    {!isStarter && can('clients:edit') && (
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTagDropdownClientId(
                            tagDropdownClientId === client.id ? null : client.id
                          )}
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </Button>
                        {tagDropdownClientId === client.id && (
                          <div className="absolute right-0 top-full mt-1 bg-surface-raised border border-border-default rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                            {tags.map((tag) => {
                              const isAssigned = (clientTagMap[client.id] || []).includes(tag.id);
                              return (
                                <button
                                  key={tag.id}
                                  onClick={() => toggleClientTag(client.id, tag.id)}
                                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-surface-subtle"
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
                        )}
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => viewClientWaivers(client)}
                    >
                      View Waivers
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CRM Teaser — Starter only */}
      {isStarter && clients.length > 0 && (
        <UpgradePrompt
          feature="CRM & Marketing Tools"
          description="Tag clients, send SMS and email broadcasts, automate aftercare follow-ups, and nurture new client relationships."
          variant="inline"
        />
      )}

      {/* Add Client Modal */}
      {showForm && (
        <ClientFormModal
          onSave={handleAddClient}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Client Detail / Waiver Modal */}
      {selectedClient && (
        <Modal isOpen={true} onClose={() => setSelectedClient(null)} size="lg">
          <ModalHeader>
            <h2 className="text-lg font-semibold text-text-primary">
              {selectedClient.first_name} {selectedClient.last_name}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {selectedClient.email}
              {selectedClient.email && selectedClient.phone && ' · '}
              {selectedClient.phone}
            </p>
            {/* Tags on client detail */}
            {!isStarter && (
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                {(clientTagMap[selectedClient.id] || []).map(getTag).filter(Boolean).map((tag) => (
                  <span
                    key={tag!.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{ backgroundColor: `${tag!.color}18`, color: tag!.color }}
                  >
                    {tag!.name}
                    {can('clients:edit') && (
                      <button
                        onClick={() => toggleClientTag(selectedClient.id, tag!.id)}
                        className="hover:opacity-70"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
                {can('clients:edit') && (
                  <div className="relative">
                    <button
                      onClick={() => setTagDropdownClientId(
                        tagDropdownClientId === selectedClient.id ? null : selectedClient.id
                      )}
                      className="text-[10px] text-text-tertiary hover:text-text-primary px-1.5 py-0.5 border border-dashed border-border-default rounded-full"
                    >
                      + tag
                    </button>
                    {tagDropdownClientId === selectedClient.id && (
                      <div className="absolute left-0 top-full mt-1 bg-surface-raised border border-border-default rounded-xl shadow-lg z-20 min-w-[180px] py-1">
                        {tags.map((tag) => {
                          const isAssigned = (clientTagMap[selectedClient.id] || []).includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              onClick={() => toggleClientTag(selectedClient.id, tag.id)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-surface-subtle"
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
                    )}
                  </div>
                )}
              </div>
            )}
          </ModalHeader>
          <ModalBody>
            <h3 className="font-semibold text-text-primary mb-3">
              Waivers ({waivers.length})
            </h3>
            {waivers.length === 0 ? (
              <p className="text-text-tertiary text-sm">No waivers signed yet.</p>
            ) : (
              <div className="space-y-3">
                {waivers.map((waiver) => (
                  <div key={waiver.id} className="border border-border-default rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="success">Signed</Badge>
                      <span className="text-xs text-text-tertiary">
                        {format(new Date(waiver.signed_at), 'MMM d, yyyy h:mm a')}
                      </span>
                    </div>
                    <p className="text-sm text-text-secondary mb-2">
                      {waiver.signer_name}
                      {waiver.signer_email && ` · ${waiver.signer_email}`}
                    </p>
                    {waiver.signature_data && (
                      <div className="mt-2 border border-border-subtle rounded-md bg-surface-raised p-2">
                        <img src={waiver.signature_data} alt="Signature" className="max-h-16 mx-auto" />
                      </div>
                    )}
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDownloadPDF(waiver)}
                        disabled={downloadingId === waiver.id}
                      >
                        {downloadingId === waiver.id ? 'Generating…' : 'Download PDF'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setSelectedClient(null)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Tag Manager Modal */}
      {showTagManager && (
        <TagManagerModal
          tenantId={tenant?.id || ''}
          tags={tags}
          onClose={() => setShowTagManager(false)}
          onRefresh={fetchTags}
        />
      )}

      {/* Close dropdowns on outside click */}
      {(tagDropdownClientId || showBulkTagDropdown || showSegmentDropdown) && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => {
            setTagDropdownClientId(null);
            setShowBulkTagDropdown(false);
            setShowSegmentDropdown(false);
          }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tag Manager Modal
// ══════════════════════════════════════════════════════════════════════════════

function TagManagerModal({
  tenantId,
  tags,
  onClose,
  onRefresh,
}: {
  tenantId: string;
  tags: TagWithCount[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(TAG_COLORS[0].hex);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<TagWithCount | null>(null);

  const createTag = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenantId, name: newName.trim(), color: newColor }),
    });
    setSaving(false);
    if (res.ok) {
      setNewName('');
      setNewColor(TAG_COLORS[0].hex);
      onRefresh();
      toast.success('Tag created');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to create tag');
    }
  };

  const updateTag = async () => {
    if (!editingId || !editName.trim()) return;
    const res = await fetch(`/api/tags/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    if (res.ok) {
      setEditingId(null);
      onRefresh();
      toast.success('Tag updated');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to update tag');
    }
  };

  const deleteTag = async (id: string) => {
    const res = await fetch(`/api/tags/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setConfirmDelete(null);
      onRefresh();
      toast.success('Tag deleted');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="md">
      <ModalHeader>
        <h2 className="text-lg font-semibold text-text-primary">Manage Tags</h2>
      </ModalHeader>
      <ModalBody>
        {/* Create new tag */}
        <div className="flex items-end gap-2 mb-5">
          <div className="flex-1">
            <Input
              label="New tag"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Tag name"
              onKeyDown={(e) => e.key === 'Enter' && createTag()}
            />
          </div>
          <div className="flex gap-1 pb-0.5">
            {TAG_COLORS.map((c) => (
              <button
                key={c.hex}
                onClick={() => setNewColor(c.hex)}
                className="w-6 h-6 rounded-full border-2 transition-transform"
                style={{
                  backgroundColor: c.hex,
                  borderColor: newColor === c.hex ? c.hex : 'transparent',
                  transform: newColor === c.hex ? 'scale(1.2)' : 'scale(1)',
                }}
                title={c.label}
              />
            ))}
          </div>
          <Button variant="primary" size="sm" onClick={createTag} disabled={saving || !newName.trim()}>
            Add
          </Button>
        </div>

        {/* Existing tags */}
        <div className="space-y-2">
          {tags.map((tag) => (
            <div key={tag.id}>
              {editingId === tag.id ? (
                <div className="flex items-center gap-2 p-2 bg-surface-subtle rounded-lg">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 text-sm px-2 py-1 border border-border-default rounded-md bg-surface-raised text-text-primary"
                    onKeyDown={(e) => e.key === 'Enter' && updateTag()}
                    autoFocus
                  />
                  <div className="flex gap-1">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setEditColor(c.hex)}
                        className="w-5 h-5 rounded-full border-2"
                        style={{
                          backgroundColor: c.hex,
                          borderColor: editColor === c.hex ? c.hex : 'transparent',
                        }}
                      />
                    ))}
                  </div>
                  <Button variant="primary" size="sm" onClick={updateTag}>Save</Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2 hover:bg-surface-subtle rounded-lg group">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 text-sm text-text-primary">{tag.name}</span>
                  <span className="text-xs text-text-tertiary">{tag.usage_count} clients</span>
                  <button
                    onClick={() => { setEditingId(tag.id); setEditName(tag.name); setEditColor(tag.color); }}
                    className="text-text-tertiary hover:text-text-primary opacity-0 group-hover:opacity-100 p-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDelete(tag)}
                    className="text-text-tertiary hover:text-red-500 opacity-0 group-hover:opacity-100 p-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Delete confirmation */}
        {confirmDelete && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">
              Delete &quot;{confirmDelete.name}&quot;? This will remove it from {confirmDelete.usage_count} client{confirmDelete.usage_count !== 1 ? 's' : ''}.
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="danger" size="sm" onClick={() => deleteTag(confirmDelete.id)}>Delete</Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            </div>
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Done</Button>
      </ModalFooter>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Add Client Modal (unchanged)
// ══════════════════════════════════════════════════════════════════════════════

function ClientFormModal({
  onSave,
  onClose,
}: {
  onSave: (data: Partial<Client>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      notes: form.notes || null,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="md">
      <ModalHeader>
        <h2 className="text-lg font-semibold text-text-primary">Add Client</h2>
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes about this client" />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">Add Client</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
