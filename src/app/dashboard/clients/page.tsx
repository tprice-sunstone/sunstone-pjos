'use client';

import { useEffect, useState } from 'react';
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
import type { Client, Waiver } from '@/types';

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

  const fetchClients = async () => {
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
  };

  useEffect(() => {
    fetchClients();
  }, [tenant, search]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Clients</h1>
          <p className="text-text-tertiary mt-1">{clients.length} clients</p>
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

      {/* Search */}
      <div className="max-w-md">
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Client List */}
      {loading ? (
        <div className="text-text-tertiary py-12 text-center">Loading…</div>
      ) : clients.length === 0 ? (
        <Card padding="lg">
          <CardContent>
            <div className="text-center py-8">
              <p className="text-text-tertiary mb-4">
                {search ? 'No clients found' : 'No clients yet'}
              </p>
              {!search && can('clients:edit') && (
                <Button variant="primary" onClick={() => setShowForm(true)}>
                  Add Your First Client
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {clients.map((client) => (
            <Card key={client.id} variant="interactive" padding="md">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-text-primary">
                    {client.first_name} {client.last_name}
                  </div>
                  <div className="text-sm text-text-secondary mt-0.5">
                    {client.email && <span>{client.email}</span>}
                    {client.email && client.phone && <span> · </span>}
                    {client.phone && <span>{client.phone}</span>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => viewClientWaivers(client)}
                >
                  View Waivers
                </Button>
              </div>
            </Card>
          ))}
        </div>
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
    </div>
  );
}

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