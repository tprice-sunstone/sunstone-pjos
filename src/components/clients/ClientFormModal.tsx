'use client';

import { useState } from 'react';
import {
  Button,
  Input,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@/components/ui';
import type { Client } from '@/types';

interface ClientFormModalProps {
  client?: Client | null;
  onSave: (data: Partial<Client>) => void;
  onClose: () => void;
}

export default function ClientFormModal({ client, onSave, onClose }: ClientFormModalProps) {
  const isEdit = !!client;
  const [form, setForm] = useState({
    first_name: client?.first_name || '',
    last_name: client?.last_name || '',
    email: client?.email || '',
    phone: client?.phone || '',
    birthday: client?.birthday || '',
    notes: client?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      birthday: form.birthday || null,
      notes: form.notes || null,
    });
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="md">
      <ModalHeader>
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          {isEdit ? 'Edit Client' : 'Add Client'}
        </h2>
      </ModalHeader>
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            <Input label="Last Name" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input label="Birthday" type="date" value={form.birthday} onChange={(e) => setForm({ ...form, birthday: e.target.value })} />
          <Input label="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes about this client" />
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit">{isEdit ? 'Save Changes' : 'Add Client'}</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
