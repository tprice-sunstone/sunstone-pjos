'use client';

import { useEffect, useState, useCallback } from 'react';
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
import type {
  Broadcast,
  MessageTemplate,
  MessageChannel,
  BroadcastTargetType,
} from '@/types';
import { renderTemplate, SAMPLE_VARIABLES } from '@/lib/templates';
import UpgradePrompt from '@/components/ui/UpgradePrompt';

// ── Status badge colors ────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-[var(--surface-subtle)]', text: 'text-[var(--text-secondary)]', label: 'Draft' },
  sending: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Sending…' },
  completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'Sent' },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
};

export default function BroadcastsPage() {
  const { tenant } = useTenant();

  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [viewDetail, setViewDetail] = useState<Broadcast | null>(null);

  // Subscription gating
  const isStarter = (() => {
    if (!tenant) return true;
    if (tenant.subscription_status === 'active' && (tenant.subscription_tier === 'pro' || tenant.subscription_tier === 'business')) return false;
    if (tenant.trial_ends_at && new Date(tenant.trial_ends_at) > new Date()) return false;
    return true;
  })();

  const fetchBroadcasts = useCallback(async () => {
    if (!tenant) return;
    const res = await fetch(`/api/broadcasts?tenantId=${tenant.id}`);
    if (res.ok) setBroadcasts(await res.json());
    setLoading(false);
  }, [tenant]);

  useEffect(() => { fetchBroadcasts(); }, [fetchBroadcasts]);

  if (isStarter) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Broadcasts</h1>
          <p className="text-text-tertiary mt-1">Send SMS and email blasts to your clients</p>
        </div>
        <UpgradePrompt
          feature="Broadcasts"
          description="Send targeted SMS and email messages to groups of clients using tags, segments, or your entire client list."
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
          <h1 className="text-2xl font-semibold text-text-primary">Broadcasts</h1>
          <p className="text-text-tertiary mt-1">{broadcasts.length} broadcasts</p>
        </div>
        <Button variant="primary" onClick={() => setShowNew(true)}>
          + New Broadcast
        </Button>
      </div>

      {/* Broadcast list */}
      {loading ? (
        <div className="text-text-tertiary py-12 text-center">Loading…</div>
      ) : broadcasts.length === 0 ? (
        <Card padding="lg">
          <CardContent>
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface-subtle flex items-center justify-center">
                <svg className="w-6 h-6 text-text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
                </svg>
              </div>
              <p className="text-text-secondary font-medium mb-1">No broadcasts yet</p>
              <p className="text-text-tertiary text-sm mb-4">Send your first message blast to clients</p>
              <Button variant="primary" onClick={() => setShowNew(true)}>
                Create Broadcast
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {broadcasts.map((b) => {
            const style = STATUS_STYLES[b.status] || STATUS_STYLES.draft;
            return (
              <Card key={b.id} variant="interactive" padding="none">
                <button
                  className="w-full text-left p-4 flex items-center gap-4"
                  onClick={() => setViewDetail(b)}
                >
                  {/* Channel icon */}
                  <div className="w-10 h-10 rounded-full bg-surface-subtle flex items-center justify-center flex-shrink-0">
                    {b.channel === 'sms' ? (
                      <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                      </svg>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-medium text-text-primary text-sm truncate">{b.name}</h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
                        {style.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-tertiary">
                      <span>{b.channel.toUpperCase()}</span>
                      <span>·</span>
                      <span>{b.target_name || b.target_type === 'all' ? 'All Clients' : b.target_type}</span>
                      {b.sent_at && (
                        <>
                          <span>·</span>
                          <span>{new Date(b.sent_at).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  {b.status === 'completed' && (
                    <div className="flex items-center gap-4 text-xs flex-shrink-0">
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{b.sent_count}</div>
                        <div className="text-text-tertiary">Sent</div>
                      </div>
                      {b.failed_count > 0 && (
                        <div className="text-center">
                          <div className="font-semibold text-red-600">{b.failed_count}</div>
                          <div className="text-text-tertiary">Failed</div>
                        </div>
                      )}
                      {b.skipped_count > 0 && (
                        <div className="text-center">
                          <div className="font-semibold text-amber-600">{b.skipped_count}</div>
                          <div className="text-text-tertiary">Skipped</div>
                        </div>
                      )}
                    </div>
                  )}

                  <svg className="w-4 h-4 text-text-tertiary flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Broadcast Flow */}
      {showNew && tenant && (
        <NewBroadcastFlow
          tenantId={tenant.id}
          tenantName={tenant.name}
          tenantPhone={tenant.phone || ''}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); fetchBroadcasts(); }}
        />
      )}

      {/* Broadcast Detail */}
      {viewDetail && (
        <BroadcastDetail
          broadcast={viewDetail}
          onClose={() => setViewDetail(null)}
          onDeleted={() => { setViewDetail(null); fetchBroadcasts(); }}
          onSent={() => { setViewDetail(null); fetchBroadcasts(); }}
        />
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// New Broadcast Flow (stepped)
// ══════════════════════════════════════════════════════════════════════════════

type Step = 'setup' | 'preview' | 'confirm';

interface PreviewData {
  total: number;
  sendable: number;
  missingContact: number;
  noConsent: number;
  recipients: Array<{
    id: string;
    name: string;
    contact: string | null;
    willSend: boolean;
    hasConsent: boolean;
  }>;
  sampleBody: string;
  sampleSubject: string | null;
}

function NewBroadcastFlow({
  tenantId,
  tenantName,
  tenantPhone,
  onClose,
  onCreated,
}: {
  tenantId: string;
  tenantName: string;
  tenantPhone: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [step, setStep] = useState<Step>('setup');

  // Setup fields
  const [name, setName] = useState('');
  const [channel, setChannel] = useState<MessageChannel>('sms');
  const [targetType, setTargetType] = useState<BroadcastTargetType>('all');
  const [targetId, setTargetId] = useState<string>('');
  const [targetName, setTargetName] = useState<string>('');
  const [useTemplate, setUseTemplate] = useState(true);
  const [templateId, setTemplateId] = useState<string>('');
  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');

  // Available targets
  const [tags, setTags] = useState<Array<{ id: string; name: string }>>([]);
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  // Preview
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [broadcastId, setBroadcastId] = useState<string | null>(null);

  // Sending
  const [sending, setSending] = useState(false);

  // Load tags, segments, templates on mount
  useEffect(() => {
    if (!tenantId) return;
    fetch(`/api/tags?tenantId=${tenantId}`).then((r) => r.ok ? r.json() : []).then(setTags);
    fetch(`/api/segments?tenantId=${tenantId}`).then((r) => r.ok ? r.json() : []).then(setSegments);
    fetch(`/api/templates?tenantId=${tenantId}`).then((r) => r.ok ? r.json() : []).then(setTemplates);
  }, [tenantId]);

  const filteredTemplates = templates.filter((t) => t.channel === channel);

  // Step: Setup → create draft then preview
  const handleNext = async () => {
    if (!name.trim()) { toast.error('Enter a broadcast name'); return; }
    if (useTemplate && !templateId) { toast.error('Select a template'); return; }
    if (!useTemplate && !customBody.trim()) { toast.error('Enter a message body'); return; }
    if (targetType !== 'all' && !targetId) { toast.error('Select a target'); return; }

    // Create draft broadcast
    const res = await fetch('/api/broadcasts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        name: name.trim(),
        channel,
        template_id: useTemplate ? templateId : null,
        custom_subject: !useTemplate ? customSubject : null,
        custom_body: !useTemplate ? customBody : null,
        target_type: targetType,
        target_id: targetType !== 'all' ? targetId : null,
        target_name: targetName || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || 'Failed to create broadcast');
      return;
    }

    const broadcast = await res.json();
    setBroadcastId(broadcast.id);

    // Load preview
    setPreviewLoading(true);
    setStep('preview');
    const previewRes = await fetch(`/api/broadcasts/${broadcast.id}/preview`);
    if (previewRes.ok) {
      setPreview(await previewRes.json());
    }
    setPreviewLoading(false);
  };

  // Step: Preview → send
  const handleSend = async () => {
    if (!broadcastId) return;
    setSending(true);
    setStep('confirm');

    const res = await fetch(`/api/broadcasts/${broadcastId}/send`, { method: 'POST' });
    setSending(false);

    if (res.ok) {
      const result = await res.json();
      toast.success(`Broadcast sent! ${result.sent} delivered, ${result.skipped} skipped, ${result.failed} failed`);
      onCreated();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Broadcast failed');
      onCreated();
    }
  };

  // Delete draft on cancel
  const handleCancel = async () => {
    if (broadcastId) {
      await fetch(`/api/broadcasts/${broadcastId}`, { method: 'DELETE' });
    }
    onClose();
  };

  return (
    <Modal isOpen={true} onClose={handleCancel} size="xl">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-text-primary">
            {step === 'setup' ? 'New Broadcast' : step === 'preview' ? 'Preview & Confirm' : 'Sending…'}
          </h2>
          {/* Step indicator */}
          <div className="flex items-center gap-1 ml-auto">
            {(['setup', 'preview', 'confirm'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`w-2 h-2 rounded-full ${
                  s === step ? 'bg-[var(--accent-primary)]' : 'bg-surface-subtle'
                }`}
              />
            ))}
          </div>
        </div>
      </ModalHeader>
      <ModalBody>
        {step === 'setup' && (
          <div className="space-y-4">
            <Input
              label="Broadcast Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. January Promo Blast"
            />

            {/* Channel */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Channel</label>
              <div className="flex gap-1 bg-surface-subtle rounded-xl p-1 max-w-xs">
                {(['sms', 'email'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => { setChannel(ch); setTemplateId(''); }}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
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

            {/* Target audience */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Audience</label>
              <div className="flex gap-2 mb-2">
                {([
                  { value: 'all', label: 'All Clients' },
                  { value: 'tag', label: 'By Tag' },
                  { value: 'segment', label: 'By Segment' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setTargetType(opt.value); setTargetId(''); setTargetName(''); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      targetType === opt.value
                        ? 'bg-[var(--accent-primary)] text-white'
                        : 'bg-surface-subtle text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {targetType === 'tag' && (
                <select
                  value={targetId}
                  onChange={(e) => {
                    setTargetId(e.target.value);
                    setTargetName(tags.find((t) => t.id === e.target.value)?.name || '');
                  }}
                  className="w-full min-h-[40px] px-3 text-sm border border-border-default rounded-lg bg-surface-raised text-text-primary"
                >
                  <option value="">Select a tag…</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}

              {targetType === 'segment' && (
                <select
                  value={targetId}
                  onChange={(e) => {
                    setTargetId(e.target.value);
                    setTargetName(segments.find((s) => s.id === e.target.value)?.name || '');
                  }}
                  className="w-full min-h-[40px] px-3 text-sm border border-border-default rounded-lg bg-surface-raised text-text-primary"
                >
                  <option value="">Select a segment…</option>
                  {segments.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Message source */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">Message</label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setUseTemplate(true)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    useTemplate
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-surface-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Use Template
                </button>
                <button
                  onClick={() => setUseTemplate(false)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    !useTemplate
                      ? 'bg-[var(--accent-primary)] text-white'
                      : 'bg-surface-subtle text-text-secondary hover:text-text-primary'
                  }`}
                >
                  Custom Message
                </button>
              </div>

              {useTemplate ? (
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  className="w-full min-h-[40px] px-3 text-sm border border-border-default rounded-lg bg-surface-raised text-text-primary"
                >
                  <option value="">Select a template…</option>
                  {filteredTemplates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  {channel === 'email' && (
                    <Input
                      label="Subject Line"
                      value={customSubject}
                      onChange={(e) => setCustomSubject(e.target.value)}
                      placeholder="Subject…"
                    />
                  )}
                  <textarea
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    rows={channel === 'sms' ? 4 : 8}
                    className="w-full px-3 py-2.5 text-sm border border-border-default rounded-lg bg-surface-raised text-text-primary resize-y min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--accent-subtle)]"
                    placeholder="Type your message… Use {{client_name}}, {{client_first_name}}, {{business_name}}, {{business_phone}}"
                  />
                  {channel === 'sms' && (
                    <span className={`text-xs font-medium ${
                      customBody.length <= 160 ? 'text-green-600' :
                      customBody.length <= 320 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {customBody.length} / 160 characters
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            {previewLoading ? (
              <div className="text-text-tertiary py-8 text-center">Loading preview…</div>
            ) : preview ? (
              <>
                {/* Stats summary */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-surface-subtle rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-text-primary">{preview.total}</div>
                    <div className="text-xs text-text-tertiary">Total</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-700">{preview.sendable}</div>
                    <div className="text-xs text-green-600">Will Send</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-amber-700">{preview.missingContact}</div>
                    <div className="text-xs text-amber-600">No Contact</div>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-700">{preview.noConsent}</div>
                    <div className="text-xs text-red-600">No Consent</div>
                  </div>
                </div>

                {/* Sample message */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Message Preview</label>
                  <div className="border border-border-default rounded-xl bg-surface-subtle p-4">
                    {channel === 'sms' ? (
                      <div className="max-w-[300px]">
                        <div className="bg-[var(--accent-primary)] text-white rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                          {preview.sampleBody || 'No message content'}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-surface-raised rounded-lg border border-border-default overflow-hidden">
                        {preview.sampleSubject && (
                          <div className="px-4 py-3 border-b border-border-default">
                            <p className="text-sm font-medium text-text-primary">{preview.sampleSubject}</p>
                          </div>
                        )}
                        <div className="px-4 py-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                          {preview.sampleBody || 'No message content'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recipient list */}
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">
                    Recipients ({preview.recipients.length}{preview.total > 50 ? ` of ${preview.total}` : ''})
                  </label>
                  <div className="border border-border-default rounded-lg overflow-hidden max-h-[200px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-surface-subtle sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">Contact</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-text-tertiary">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.recipients.map((r) => (
                          <tr key={r.id} className="border-t border-border-default">
                            <td className="px-3 py-2 text-text-primary">{r.name}</td>
                            <td className="px-3 py-2 text-text-secondary font-mono text-xs">{r.contact || '—'}</td>
                            <td className="px-3 py-2 text-center">
                              {r.willSend ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Send</span>
                              ) : !r.contact ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">No contact</span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">No consent</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-text-tertiary py-8 text-center">Failed to load preview</div>
            )}
          </div>
        )}

        {step === 'confirm' && (
          <div className="text-center py-8">
            {sending ? (
              <>
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center animate-pulse">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </div>
                <p className="text-text-primary font-medium">Sending broadcast…</p>
                <p className="text-text-tertiary text-sm mt-1">This may take a moment</p>
              </>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <p className="text-text-primary font-medium">Broadcast complete!</p>
              </>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'setup' && (
          <>
            <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleNext}>
              Next: Preview
            </Button>
          </>
        )}
        {step === 'preview' && (
          <>
            <Button variant="secondary" onClick={() => setStep('setup')}>Back</Button>
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={!preview || preview.sendable === 0}
            >
              Send to {preview?.sendable || 0} Recipients
            </Button>
          </>
        )}
        {step === 'confirm' && !sending && (
          <Button variant="primary" onClick={onCreated}>Done</Button>
        )}
      </ModalFooter>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Broadcast Detail Modal
// ══════════════════════════════════════════════════════════════════════════════

function BroadcastDetail({
  broadcast,
  onClose,
  onDeleted,
  onSent,
}: {
  broadcast: Broadcast;
  onClose: () => void;
  onDeleted: () => void;
  onSent: () => void;
}) {
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/broadcasts/${broadcast.id}`)
      .then((r) => r.json())
      .then((d) => { setDetail(d); setLoading(false); });
  }, [broadcast.id]);

  const handleDelete = async () => {
    const res = await fetch(`/api/broadcasts/${broadcast.id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Broadcast deleted');
      onDeleted();
    } else {
      toast.error('Failed to delete');
    }
  };

  const handleSend = async () => {
    setSending(true);
    const res = await fetch(`/api/broadcasts/${broadcast.id}/send`, { method: 'POST' });
    setSending(false);
    if (res.ok) {
      const result = await res.json();
      toast.success(`Broadcast sent! ${result.sent} delivered`);
      onSent();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Send failed');
    }
  };

  const style = STATUS_STYLES[broadcast.status] || STATUS_STYLES.draft;

  return (
    <Modal isOpen={true} onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-text-primary">{broadcast.name}</h2>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
            {style.label}
          </span>
        </div>
      </ModalHeader>
      <ModalBody>
        {loading ? (
          <div className="text-text-tertiary py-8 text-center">Loading…</div>
        ) : (
          <div className="space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-text-tertiary">Channel: </span>
                <span className="text-text-primary font-medium">{broadcast.channel.toUpperCase()}</span>
              </div>
              <div>
                <span className="text-text-tertiary">Audience: </span>
                <span className="text-text-primary font-medium">
                  {broadcast.target_name || (broadcast.target_type === 'all' ? 'All Clients' : broadcast.target_type)}
                </span>
              </div>
              {broadcast.sent_at && (
                <div>
                  <span className="text-text-tertiary">Sent: </span>
                  <span className="text-text-primary font-medium">
                    {new Date(broadcast.sent_at).toLocaleString()}
                  </span>
                </div>
              )}
              <div>
                <span className="text-text-tertiary">Created: </span>
                <span className="text-text-primary font-medium">
                  {new Date(broadcast.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Stats (if sent) */}
            {broadcast.status === 'completed' && (
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-surface-subtle rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-text-primary">{broadcast.total_recipients}</div>
                  <div className="text-xs text-text-tertiary">Total</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-700">{broadcast.sent_count}</div>
                  <div className="text-xs text-green-600">Sent</div>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-red-700">{broadcast.failed_count}</div>
                  <div className="text-xs text-red-600">Failed</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-amber-700">{broadcast.skipped_count}</div>
                  <div className="text-xs text-amber-600">Skipped</div>
                </div>
              </div>
            )}

            {/* Message log */}
            {detail?.messages && detail.messages.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Message Log ({detail.messages.length})
                </label>
                <div className="border border-border-default rounded-lg overflow-hidden max-h-[250px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-subtle sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">Recipient</th>
                        <th className="px-3 py-2 text-center text-xs font-medium text-text-tertiary">Status</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-text-tertiary">Error</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.messages.map((m: any) => {
                        const msgStyle = m.status === 'sent' ? 'bg-green-100 text-green-700'
                          : m.status === 'failed' ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700';
                        return (
                          <tr key={m.id} className="border-t border-border-default">
                            <td className="px-3 py-2 text-text-primary font-mono text-xs">{m.recipient}</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${msgStyle}`}>
                                {m.status}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-text-tertiary text-xs">{m.error_message || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        {broadcast.status === 'draft' && (
          <>
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>
            <Button variant="primary" onClick={handleSend} loading={sending}>
              Send Now
            </Button>
          </>
        )}
        {broadcast.status !== 'draft' && (
          <Button variant="secondary" onClick={onClose}>Close</Button>
        )}
      </ModalFooter>

      {/* Delete confirmation */}
      {confirmDelete && (
        <Modal isOpen={true} onClose={() => setConfirmDelete(false)} size="sm">
          <ModalHeader>
            <h2 className="text-lg font-semibold text-text-primary">Delete Broadcast</h2>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete &quot;{broadcast.name}&quot;? This action cannot be undone.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </ModalFooter>
        </Modal>
      )}
    </Modal>
  );
}
