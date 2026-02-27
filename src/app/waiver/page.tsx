// ============================================================================
// Public Waiver Page — src/app/waiver/page.tsx
// ============================================================================
// Customer-facing waiver signing page. Accessed via QR code.
// Works with ?tenant=SLUG&event=EVENT_ID (queue mode)
// Works with ?tenant=SLUG only (store check-in mode)
// ============================================================================

'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Select, Card, CardContent } from '@/components/ui';
import { applyAccentColor, isValidHexColor } from '@/lib/theme';
import type { Tenant, Event } from '@/types';

const DEFAULT_BRAND_COLOR = '#ee7743';

function WaiverPageInner() {
  const params = useSearchParams();
  const tenantSlug = params.get('tenant');
  const eventId = params.get('event');

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [step, setStep] = useState<'form' | 'sign' | 'done'>('form');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    event_id: eventId || '',
  });
  const [smsConsent, setSmsConsent] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const supabase = createClient();

  // ── Load tenant ────────────────────────────────────────────────────────

  useEffect(() => {
    if (!tenantSlug) return;
    const load = async () => {
      const { data: t } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', tenantSlug)
        .single();
      if (t) {
        setTenant(t as Tenant);
        // Load active events for this tenant (for event selector if no event param)
        const { data: evts } = await supabase
          .from('events')
          .select('*')
          .eq('tenant_id', t.id)
          .eq('is_active', true)
          .gte('start_time', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString())
          .order('start_time');
        setEvents((evts || []) as Event[]);
      }
    };
    load();
  }, [tenantSlug]);

  // ── Apply tenant brand color ───────────────────────────────────────────

  useEffect(() => {
    const color = tenant?.brand_color;
    if (color && isValidHexColor(color)) {
      applyAccentColor(color);
    } else {
      applyAccentColor(DEFAULT_BRAND_COLOR);
    }
  }, [tenant?.brand_color]);

  // ── Canvas drawing ─────────────────────────────────────────────────────

  useEffect(() => {
    if (step !== 'sign') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.offsetWidth * 2;
    canvas.height = canvas.offsetHeight * 2;
    ctx.scale(2, 2);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const touch = 'touches' in e ? e.touches[0] : e;
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const start = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      isDrawing.current = true;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current) return;
      e.preventDefault();
      const pos = getPos(e);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    };

    const end = () => {
      isDrawing.current = false;
    };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', end);
    canvas.addEventListener('mouseleave', end);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', end);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', end);
      canvas.removeEventListener('mouseleave', end);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', end);
    };
  }, [step]);

  // ── Clear signature ────────────────────────────────────────────────────

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // ── Submit waiver ──────────────────────────────────────────────────────

  const submitWaiver = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const signatureData = canvas.toDataURL('image/png');

    // Check if signature is blank
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const isBlank = imageData.data.every((val, i) => i % 4 === 3 ? val === 0 : true);
      if (isBlank) {
        setError('Please sign the waiver before submitting');
        return;
      }
    }

    setSigning(true);
    setError('');

    try {
      // 1. Find or create client
      let clientId: string | null = null;

      if (form.email) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('tenant_id', tenant!.id)
          .eq('email', form.email)
          .limit(1)
          .single();

        if (existing) {
          clientId = existing.id;
          // Update name/phone if different
          await supabase
            .from('clients')
            .update({
              name: form.name,
              ...(form.phone ? { phone: form.phone } : {}),
            })
            .eq('id', existing.id);
        }
      }

      if (!clientId) {
        const { data: newClient } = await supabase
          .from('clients')
          .insert({
            tenant_id: tenant!.id,
            name: form.name,
            email: form.email || null,
            phone: form.phone || null,
          })
          .select()
          .single();
        clientId = newClient?.id || null;
      }

      // 2. Create waiver
      const resolvedEventId = form.event_id || null;

      const { data: waiver, error: waiverErr } = await supabase
        .from('waivers')
        .insert({
          tenant_id: tenant!.id,
          client_id: clientId,
          event_id: resolvedEventId,
          signer_name: form.name,
          signer_email: form.email || null,
          waiver_text: tenant!.waiver_text,
          signature_data: signatureData,
          sms_consent: smsConsent,
        })
        .select()
        .single();

      if (waiverErr) throw waiverErr;

      // 3. Create queue entry
      // Determine the correct position
      let positionQuery = supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true });

      if (resolvedEventId) {
        // Event mode: position based on event entries
        positionQuery = positionQuery
          .eq('event_id', resolvedEventId)
          .in('status', ['waiting', 'notified', 'serving']);
      } else {
        // Store mode: position based on tenant entries without event
        positionQuery = positionQuery
          .eq('tenant_id', tenant!.id)
          .is('event_id', null)
          .in('status', ['waiting', 'serving']);
      }

      const { count } = await positionQuery;
      const nextPos = (count || 0) + 1;

      await supabase.from('queue_entries').insert({
        tenant_id: tenant!.id,
        event_id: resolvedEventId,
        client_id: clientId,
        name: form.name,
        phone: form.phone || null,
        email: form.email || null,
        position: nextPos,
        waiver_id: waiver?.id,
        sms_consent: smsConsent,
      });

      setStep('done');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setSigning(false);
    }
  };

  // ── Render: invalid link ───────────────────────────────────────────────

  if (!tenantSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <p className="text-[var(--text-tertiary)]">Invalid link</p>
      </div>
    );
  }

  // ── Render: loading ────────────────────────────────────────────────────

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
        <p className="text-[var(--text-tertiary)]">Loading...</p>
      </div>
    );
  }

  const brandColor = tenant.brand_color || DEFAULT_BRAND_COLOR;
  const hasEvent = !!form.event_id;

  // ── Render: main page ──────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--surface-raised)] px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          {tenant.logo_url && !logoError ? (
            <img
              src={tenant.logo_url}
              alt={tenant.name}
              className="w-14 h-14 rounded-2xl mx-auto mb-3 object-cover"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: brandColor }}
            >
              {tenant.name.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold text-[var(--text-primary)] font-display">
            {tenant.name}
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Waiver & Check-in</p>
        </div>

        {/* Step: Form */}
        {step === 'form' && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <Input
                label="Full Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Smith"
                autoFocus
                className="text-lg"
              />
              <Input
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@email.com"
              />
              <Input
                label="Phone"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />

              {/* SMS Consent */}
              <label className="flex items-start gap-3 cursor-pointer">
                <span className="flex-shrink-0 pt-0.5">
                  <input
                    type="checkbox"
                    checked={smsConsent}
                    onChange={(e) => setSmsConsent(e.target.checked)}
                    className="w-6 h-6 rounded border-2 border-[var(--border-default)] accent-[var(--accent-primary)] cursor-pointer"
                  />
                </span>
                <span className="text-xs leading-relaxed text-[var(--text-tertiary)]">
                  I agree to receive text messages from this business, including queue
                  notifications, service receipts, and aftercare instructions. Message
                  frequency varies. Message &amp; data rates may apply. Reply STOP to
                  opt out at any time. Reply HELP for assistance.
                </span>
              </label>

              {/* Event selector — only show when no event param and events exist */}
              {!eventId && events.length > 0 && (
                <Select
                  label="Event (optional)"
                  value={form.event_id}
                  onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                >
                  <option value="">Walk-in (no event)</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </Select>
              )}

              {/* Waiver text */}
              {tenant.waiver_text && (
                <div className="bg-[var(--surface-base)] rounded-lg p-4 max-h-48 overflow-y-auto">
                  <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                    {tenant.waiver_text}
                  </p>
                </div>
              )}

              <Button
                variant="primary"
                className="w-full"
                onClick={() =>
                  form.name ? setStep('sign') : setError('Please enter your name')
                }
                style={{ backgroundColor: brandColor }}
              >
                Continue to Sign
              </Button>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm text-center rounded-lg p-3">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Signature */}
        {step === 'sign' && (
          <Card>
            <CardContent className="p-6 space-y-5">
              <p className="text-[var(--text-secondary)] text-sm text-center">
                Sign below to agree to the waiver
              </p>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                  Signature
                </label>
                <canvas
                  ref={canvasRef}
                  className="signature-canvas w-full"
                  style={{ height: '200px' }}
                />
              </div>

              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={clearSignature}>
                  Clear
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  loading={signing}
                  onClick={submitWaiver}
                  style={{ backgroundColor: brandColor }}
                >
                  {signing ? 'Submitting...' : 'Submit Waiver'}
                </Button>
              </div>

              <Button variant="ghost" className="w-full" onClick={() => setStep('form')}>
                ← Back
              </Button>

              {error && (
                <div className="bg-red-50 text-red-600 text-sm text-center rounded-lg p-3">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step: Done */}
        {step === 'done' && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-green-50">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-[var(--text-primary)]">All Set!</h2>
              <p className="text-[var(--text-secondary)]">
                Your waiver has been signed.
                {hasEvent && form.phone && smsConsent && " We'll text you when it's your turn."}
                {hasEvent && form.phone && !smsConsent && " You've been added to the queue. Listen for your name to be called."}
                {hasEvent && !form.phone && " You've been added to the queue."}
                {!hasEvent && " You're all checked in! Your artist will be with you shortly."}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                You can close this page now.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Suspense wrapper for useSearchParams ──────────────────────────────────

export default function PublicWaiverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <p className="text-gray-400">Loading...</p>
        </div>
      }
    >
      <WaiverPageInner />
    </Suspense>
  );
}