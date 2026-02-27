'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { toast } from 'sonner';
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
import type { MessageTemplate, MessageChannel, MessageCategory } from '@/types';
import { renderTemplate, TEMPLATE_VARIABLES, SAMPLE_VARIABLES } from '@/lib/templates';
import UpgradePrompt from '@/components/ui/UpgradePrompt';

// ── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES: { value: MessageCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'general', label: 'General' },
  { value: 'aftercare', label: 'Aftercare' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'thank_you', label: 'Thank You' },
  { value: 'booking', label: 'Booking' },
];

const CATEGORY_COLORS: Record<string, string> = {
  general: '#64748B',
  aftercare: '#059669',
  promotion: '#D97706',
  reminder: '#2563EB',
  follow_up: '#7C3AED',
  thank_you: '#EC4899',
  booking: '#0D9488',
};

export default function TemplatesPage() {
  const { tenant } = useTenant();

  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState<MessageChannel>('sms');
  const [activeCategory, setActiveCategory] = useState<MessageCategory | 'all'>('all');
  const [editingTemplate, setEditingTemplate] = useState<MessageTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<MessageTemplate | null>(null);

  // Subscription gating
  const isStarter = (() => {
    if (!tenant) return true;
    if (tenant.subscription_status === 'active' && (tenant.subscription_tier === 'pro' || tenant.subscription_tier === 'business')) return false;
    if (tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date()) return false;
    return true;
  })();

  // ── Fetch templates ─────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    if (!tenant) return;
    const res = await fetch(`/api/templates?tenantId=${tenant.id}`);
    if (res.ok) {
      setTemplates(await res.json());
    }
    setLoading(false);
  }, [tenant]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // ── Filter ──────────────────────────────────────────────────────────────
  const filtered = templates.filter((t) => {
    if (t.channel !== activeChannel) return false;
    if (activeCategory !== 'all' && t.category !== activeCategory) return false;
    return true;
  });

  // ── Duplicate ───────────────────────────────────────────────────────────
  const duplicateTemplate = async (template: MessageTemplate) => {
    if (!tenant) return;
    const res = await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.id,
        name: `Copy of ${template.name}`,
        channel: template.channel,
        subject: template.subject,
        body: template.body,
        category: template.category,
      }),
    });
    if (res.ok) {
      toast.success('Template duplicated');
      fetchTemplates();
    } else {
      toast.error('Failed to duplicate template');
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────
  const deleteTemplate = async (id: string) => {
    const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Template deleted');
      setConfirmDelete(null);
      fetchTemplates();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to delete');
    }
  };

  // ── Starter gate ────────────────────────────────────────────────────────
  if (isStarter) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Message Templates</h1>
          <p className="text-text-tertiary mt-1">Create reusable SMS and email templates</p>
        </div>
        <UpgradePrompt
          feature="Message Templates"
          description="Create and manage reusable SMS and email templates with auto-filled client details, aftercare instructions, and more."
          variant="inline"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Message Templates</h1>
          <p className="text-text-tertiary mt-1">{templates.length} templates</p>
        </div>
        <Button
          variant="primary"
          onClick={() => { setEditingTemplate(null); setShowEditor(true); }}
        >
          + New Template
        </Button>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-1 bg-surface-subtle rounded-xl p-1 max-w-xs">
        {(['sms', 'email'] as const).map((ch) => (
          <button
            key={ch}
            onClick={() => setActiveChannel(ch)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeChannel === ch
                ? 'bg-surface-raised text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            {ch === 'sms' ? 'SMS' : 'Email'}
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat.value
                ? 'bg-[var(--accent-primary)] text-white'
                : 'bg-surface-subtle text-text-secondary hover:text-text-primary'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template grid */}
      {loading ? (
        <div className="text-text-tertiary py-12 text-center">Loading…</div>
      ) : filtered.length === 0 ? (
        <Card padding="lg">
          <CardContent>
            <div className="text-center py-8">
              <p className="text-text-tertiary mb-4">No templates found</p>
              <Button
                variant="primary"
                onClick={() => { setEditingTemplate(null); setShowEditor(true); }}
              >
                Create Template
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((template) => {
            const catColor = CATEGORY_COLORS[template.category] || '#64748B';
            return (
              <Card key={template.id} variant="interactive" padding="none">
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-text-primary text-sm truncate">
                        {template.name}
                      </h3>
                      {template.channel === 'email' && template.subject && (
                        <p className="text-xs text-text-tertiary mt-0.5 truncate">
                          {template.subject}
                        </p>
                      )}
                    </div>
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0"
                      style={{ backgroundColor: `${catColor}18`, color: catColor }}
                    >
                      {template.category.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
                    {template.body.slice(0, 120)}{template.body.length > 120 ? '…' : ''}
                  </p>

                  {/* SMS char count */}
                  {template.channel === 'sms' && (
                    <div className="flex items-center gap-1">
                      <span className={`text-[10px] font-medium ${
                        template.body.length <= 160 ? 'text-success-600' :
                        template.body.length <= 320 ? 'text-warning-600' : 'text-error-600'
                      }`}>
                        {template.body.length} chars
                        {template.body.length > 160 && ` · ${Math.ceil(template.body.length / 160)} segments`}
                      </span>
                    </div>
                  )}

                  {template.is_default && (
                    <span className="text-[10px] text-text-tertiary">Default template</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex border-t border-border-default">
                  <button
                    onClick={() => { setEditingTemplate(template); setShowEditor(true); }}
                    className="flex-1 px-3 py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors"
                  >
                    Edit
                  </button>
                  <div className="w-px bg-border-default" />
                  <button
                    onClick={() => duplicateTemplate(template)}
                    className="flex-1 px-3 py-2.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors"
                  >
                    Duplicate
                  </button>
                  {!template.is_default && (
                    <>
                      <div className="w-px bg-border-default" />
                      <button
                        onClick={() => setConfirmDelete(template)}
                        className="flex-1 px-3 py-2.5 text-xs font-medium text-error-500 hover:bg-error-50 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal isOpen={true} onClose={() => setConfirmDelete(null)} size="sm">
          <ModalHeader>
            <h2 className="text-lg font-semibold text-text-primary">Delete Template</h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete &quot;{confirmDelete.name}&quot;? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteTemplate(confirmDelete.id)}>Delete</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Template Editor */}
      {showEditor && (
        <TemplateEditor
          tenantId={tenant?.id || ''}
          tenantName={tenant?.name || ''}
          tenantPhone={tenant?.phone || ''}
          template={editingTemplate}
          defaultChannel={activeChannel}
          onClose={() => { setShowEditor(false); setEditingTemplate(null); }}
          onSaved={() => { setShowEditor(false); setEditingTemplate(null); fetchTemplates(); }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Template Editor Modal
// ══════════════════════════════════════════════════════════════════════════════

function TemplateEditor({
  tenantId,
  tenantName,
  tenantPhone,
  template,
  defaultChannel,
  onClose,
  onSaved,
}: {
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  template: MessageTemplate | null;
  defaultChannel: MessageChannel;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(template?.name || '');
  const [channel, setChannel] = useState<MessageChannel>(template?.channel || defaultChannel);
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [category, setCategory] = useState<MessageCategory>(template?.category || 'general');
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const isEditing = !!template;

  // Build sample variables using real tenant data
  const sampleVars: Record<string, string> = {
    ...SAMPLE_VARIABLES,
    business_name: tenantName || SAMPLE_VARIABLES.business_name,
    business_phone: tenantPhone || SAMPLE_VARIABLES.business_phone,
  };

  const preview = renderTemplate(body, sampleVars);
  const subjectPreview = subject ? renderTemplate(subject, sampleVars) : '';

  const insertVariable = (key: string) => {
    const textarea = bodyRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const placeholder = `{{${key}}}`;
    const newBody = body.slice(0, start) + placeholder + body.slice(end);
    setBody(newBody);
    // Restore cursor position after the inserted variable
    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = start + placeholder.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const handleSave = async () => {
    if (!name.trim() || !body.trim()) {
      toast.error('Name and body are required');
      return;
    }
    setSaving(true);

    const payload = {
      tenant_id: tenantId,
      name: name.trim(),
      channel,
      subject: channel === 'email' ? subject : null,
      body,
      category,
    };

    let res: Response;
    if (isEditing) {
      res = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    setSaving(false);
    if (res.ok) {
      toast.success(isEditing ? 'Template updated' : 'Template created');
      onSaved();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to save');
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} size="xl">
      <ModalHeader>
        <h2 className="text-lg font-semibold text-text-primary">
          {isEditing ? 'Edit Template' : 'New Template'}
        </h2>
      </ModalHeader>
      <ModalBody>
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Editor */}
          <div className="space-y-4">
            <Input
              label="Template Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aftercare Reminder"
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Channel */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Channel</label>
                <div className="flex gap-1 bg-surface-subtle rounded-lg p-1">
                  {(['sms', 'email'] as const).map((ch) => (
                    <button
                      key={ch}
                      onClick={() => setChannel(ch)}
                      className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        channel === ch
                          ? 'bg-surface-raised text-text-primary shadow-sm'
                          : 'text-text-tertiary hover:text-text-primary'
                      }`}
                    >
                      {ch === 'sms' ? 'SMS' : 'Email'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as MessageCategory)}
                  className="w-full min-h-[40px] px-3 text-sm border border-border-default rounded-lg bg-surface-raised text-text-primary"
                >
                  {CATEGORIES.filter((c) => c.value !== 'all').map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Subject (email only) */}
            {channel === 'email' && (
              <Input
                label="Subject Line"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Your Permanent Jewelry Care Guide 💍"
              />
            )}

            {/* Body */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Message Body</label>
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={channel === 'sms' ? 4 : 10}
                className="w-full px-3 py-2.5 text-sm border border-border-default rounded-lg bg-surface-raised text-text-primary resize-y min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-subtle)]"
                placeholder="Type your message..."
              />

              {/* Char count for SMS */}
              {channel === 'sms' && (
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-xs font-medium ${
                    body.length <= 160 ? 'text-success-600' :
                    body.length <= 320 ? 'text-warning-600' : 'text-error-600'
                  }`}>
                    {body.length} / 160 characters
                    {body.length > 160 && ` (${Math.ceil(body.length / 160)} SMS segments)`}
                  </span>
                </div>
              )}
            </div>

            {/* Variable insertion buttons */}
            <div>
              <label className="block text-xs font-medium text-text-tertiary mb-1.5">
                Insert Variable
              </label>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    onClick={() => insertVariable(v.key)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-surface-subtle text-text-secondary hover:text-text-primary hover:bg-surface-raised border border-border-default rounded-lg transition-colors"
                  >
                    <span className="text-[var(--accent-primary)]">{'{{'}</span>
                    {v.label}
                    <span className="text-[var(--accent-primary)]">{'}}'}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Preview */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Preview</label>
            <div className="border border-border-default rounded-xl bg-surface-subtle p-4 min-h-[200px]">
              {channel === 'sms' ? (
                /* SMS bubble preview */
                <div className="max-w-[280px]">
                  <div className="bg-[var(--accent-primary)] text-white rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed">
                    {preview || <span className="opacity-50">Your message preview will appear here…</span>}
                  </div>
                </div>
              ) : (
                /* Email preview */
                <div className="bg-surface-raised rounded-lg border border-border-default overflow-hidden">
                  {subjectPreview && (
                    <div className="px-4 py-3 border-b border-border-default">
                      <p className="text-sm font-medium text-text-primary">{subjectPreview}</p>
                    </div>
                  )}
                  <div className="px-4 py-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                    {preview || <span className="opacity-50">Your message preview will appear here…</span>}
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-text-tertiary mt-2">
              Variables shown with sample data. Actual values will be filled in when sent.
            </p>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave} loading={saving}>
          {isEditing ? 'Save Changes' : 'Create Template'}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
