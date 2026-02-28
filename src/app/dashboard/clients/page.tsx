'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
import {
  ClientsHeader,
  ClientSearch,
  TagFilterChips,
  ClientList,
  ClientProfile,
  ClientFormModal,
  TagManagerModal,
  NeedsAttention,
} from '@/components/clients';
import UpgradePrompt from '@/components/ui/UpgradePrompt';
import type { Client, ClientTag, ClientSegment } from '@/types';

interface TagWithCount extends ClientTag {
  usage_count: number;
}

type ClientTagMap = Record<string, string[]>;

export default function ClientsPage() {
  const { tenant, can } = useTenant();
  const supabase = createClient();

  // Core state
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [profileClientId, setProfileClientId] = useState<string | null>(null);

  // Tag state
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [clientTagMap, setClientTagMap] = useState<ClientTagMap>({});
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagManager, setShowTagManager] = useState(false);
  const [tagDropdownClientId, setTagDropdownClientId] = useState<string | null>(null);

  // Segment state
  const [segments, setSegments] = useState<ClientSegment[]>([]);
  const [savingSegment, setSavingSegment] = useState(false);
  const [activeSegment, setActiveSegment] = useState<ClientSegment | null>(null);

  // Bulk selection
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // Subscription gating
  const isStarter = (() => {
    if (!tenant) return true;
    if (tenant.subscription_status === 'active' && (tenant.subscription_tier === 'pro' || tenant.subscription_tier === 'business')) return false;
    if (tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date()) return false;
    return true;
  })();

  // ── Fetch clients ─────────────────────────────────────────────────────────
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

  useEffect(() => { fetchClients(); }, [fetchClients]);

  // ── Fetch tags ────────────────────────────────────────────────────────────
  const fetchTags = useCallback(async () => {
    if (!tenant || isStarter) return;
    const res = await fetch(`/api/tags?tenantId=${tenant.id}`);
    if (res.ok) setTags(await res.json());
  }, [tenant, isStarter]);

  // ── Fetch tag assignments ─────────────────────────────────────────────────
  const fetchTagAssignments = useCallback(async () => {
    if (!tenant || isStarter || clients.length === 0) return;
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

  // ── Fetch segments ────────────────────────────────────────────────────────
  const fetchSegments = useCallback(async () => {
    if (!tenant || isStarter) return;
    const res = await fetch(`/api/segments?tenantId=${tenant.id}`);
    if (res.ok) setSegments(await res.json());
  }, [tenant, isStarter]);

  useEffect(() => { fetchTags(); fetchSegments(); }, [fetchTags, fetchSegments]);
  useEffect(() => { if (clients.length > 0) fetchTagAssignments(); }, [clients, fetchTagAssignments]);

  // ── Tag filtering (AND logic) ─────────────────────────────────────────────
  const filteredClients = selectedTagIds.length > 0
    ? clients.filter((c) => {
        const ct = clientTagMap[c.id] || [];
        return selectedTagIds.every((tagId) => ct.includes(tagId));
      })
    : clients;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const toggleTagFilter = (tagId: string) => {
    setActiveSegment(null);
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const applySegment = (segment: ClientSegment) => {
    setSelectedTagIds(segment.filter_criteria?.tagIds || []);
    setActiveSegment(segment);
  };

  const saveAsSegment = async () => {
    if (!tenant || selectedTagIds.length === 0) return;
    const name = prompt('Segment name:');
    if (!name) return;
    setSavingSegment(true);
    const res = await fetch('/api/segments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: tenant.id, name, filter_criteria: { tagIds: selectedTagIds } }),
    });
    setSavingSegment(false);
    if (res.ok) { toast.success('Segment saved'); fetchSegments(); }
    else toast.error('Failed to save segment');
  };

  const deleteSegment = async (id: string) => {
    const res = await fetch(`/api/segments/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Segment deleted');
      if (activeSegment?.id === id) { setActiveSegment(null); setSelectedTagIds([]); }
      fetchSegments();
    }
  };

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
    setClientTagMap((prev) => {
      const current = prev[clientId] || [];
      return { ...prev, [clientId]: assigned ? current.filter((id) => id !== tagId) : [...current, tagId] };
    });
    fetchTags();
  };

  const bulkAssignTag = async (tagId: string) => {
    const promises = Array.from(selectedClientIds).map((cid) => {
      if ((clientTagMap[cid] || []).includes(tagId)) return Promise.resolve();
      return fetch(`/api/clients/${cid}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId }),
      });
    });
    await Promise.all(promises);
    toast.success(`Tagged ${selectedClientIds.size} clients`);
    setSelectedClientIds(new Set());
    fetchTagAssignments();
    fetchTags();
  };

  const handleAddClient = async (data: Partial<Client>) => {
    if (!tenant) return;
    const { error } = await supabase.from('clients').insert({ ...data, tenant_id: tenant.id });
    if (error) { toast.error(error.message); return; }
    toast.success('Client added');
    setShowForm(false);
    fetchClients();
  };

  const waiverUrl = tenant
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/waiver?tenant=${tenant.slug}`
    : '';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <ClientsHeader
        clientCount={clients.length}
        filteredCount={filteredClients.length}
        isFiltered={selectedTagIds.length > 0}
        waiverLink={waiverUrl}
        canEdit={can('clients:edit')}
        onAddClient={() => setShowForm(true)}
      />

      {/* Search + Tag Filters */}
      <div className="space-y-3">
        <ClientSearch onSearch={setSearch} />
        {!isStarter && (
          <TagFilterChips
            tags={tags}
            selectedTagIds={selectedTagIds}
            segments={segments}
            activeSegment={activeSegment}
            savingSegment={savingSegment}
            canEdit={can('clients:edit')}
            onToggleTag={toggleTagFilter}
            onClearFilters={() => { setSelectedTagIds([]); setActiveSegment(null); }}
            onSaveSegment={saveAsSegment}
            onApplySegment={applySegment}
            onDeleteSegment={deleteSegment}
            onManageTags={() => setShowTagManager(true)}
          />
        )}
      </div>

      {/* Needs Attention */}
      {!isStarter && tenant && (
        <NeedsAttention
          tenantId={tenant.id}
          onOpenProfile={(cid) => setProfileClientId(cid)}
          onSendMessage={() => {}}
        />
      )}

      {/* Client List */}
      <ClientList
        clients={filteredClients}
        loading={loading}
        isStarter={isStarter}
        canEdit={can('clients:edit')}
        tags={tags}
        clientTagMap={clientTagMap}
        selectedClientIds={selectedClientIds}
        tagDropdownClientId={tagDropdownClientId}
        hasFilters={!!search || selectedTagIds.length > 0}
        onToggleSelect={(cid) => {
          setSelectedClientIds((prev) => {
            const next = new Set(prev);
            if (next.has(cid)) next.delete(cid); else next.add(cid);
            return next;
          });
        }}
        onClearSelection={() => setSelectedClientIds(new Set())}
        onBulkAssignTag={bulkAssignTag}
        onSetTagDropdown={setTagDropdownClientId}
        onToggleClientTag={toggleClientTag}
        onOpenProfile={(client) => setProfileClientId(client.id)}
        onAddClient={() => setShowForm(true)}
      />

      {/* CRM Teaser */}
      {isStarter && clients.length > 0 && (
        <UpgradePrompt
          feature="CRM & Marketing Tools"
          description="Tag clients, send SMS and email broadcasts, automate aftercare follow-ups, and nurture new client relationships."
          variant="inline"
        />
      )}

      {/* Client Profile Slide-in */}
      {profileClientId && (
        <ClientProfile
          clientId={profileClientId}
          onClose={() => setProfileClientId(null)}
          onEdit={() => {}}
          onTagsChanged={() => { fetchTags(); fetchTagAssignments(); }}
        />
      )}

      {/* Add Client Modal */}
      {showForm && (
        <ClientFormModal
          onSave={handleAddClient}
          onClose={() => setShowForm(false)}
        />
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
    </div>
  );
}
