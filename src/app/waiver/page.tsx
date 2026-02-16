// src/app/waiver/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useSearchParams } from 'next/navigation';
import { Button, Input, Select, Card, CardContent } from '@/components/ui';
import type { Tenant, Event } from '@/types';

export default function PublicWaiverPage() {
  const params = useSearchParams();
  const tenantSlug = params.get('tenant');
  const eventId = params.get('event');

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [step, setStep] = useState<'form' | 'sign' | 'done'>('form');
  const [form, setForm] = useState({ name: '', email: '', phone: '', event_id: eventId || '' });
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  const [logoError, setLogoError] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const supabase = createClient();

  // Load tenant
  useEffect(() => {
    if (!tenantSlug) return;
    const load = async () => {
      const { data: t } = await supabase.from('tenants').select('*').eq('slug', tenantSlug).single();
      if (t) {
        setTenant(t as Tenant);
        // Load active events for this tenant
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

  // Canvas drawing
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
      const { x, y } = getPos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (!isDrawing.current) return;
      const { x, y } = getPos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stop = () => { isDrawing.current = false; };

    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stop);

    return () => {
      canvas.removeEventListener('mousedown', start);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stop);
      canvas.removeEventListener('touchstart', start);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stop);
    };
  }, [step]);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const submitWaiver = async () => {
    if (!tenant || !canvasRef.current) return;
    setSigning(true);
    setError('');

    const signatureData = canvasRef.current.toDataURL('image/png');

    try {
      // 1. Find or create client
      let clientId: string | null = null;
      if (form.email) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('email', form.email)
          .single();

        if (existing) {
          clientId = existing.id;
        } else {
          const nameParts = form.name.trim().split(' ');
          const { data: newClient } = await supabase
            .from('clients')
            .insert({
              tenant_id: tenant.id,
              first_name: nameParts[0] || form.name,
              last_name: nameParts.slice(1).join(' ') || null,
              email: form.email || null,
              phone: form.phone || null,
            })
            .select()
            .single();
          if (newClient) clientId = newClient.id;
        }
      }

      // 2. Save waiver
      await supabase.from('waivers').insert({
        tenant_id: tenant.id,
        client_id: clientId,
        event_id: form.event_id || null,
        signer_name: form.name,
        signer_email: form.email || null,
        waiver_text: tenant.waiver_text,
        signature_data: signatureData,
        signed_at: new Date().toISOString(),
      });

      // 3. Add to queue if event selected
      if (form.event_id) {
        await supabase.from('queue_entries').insert({
          tenant_id: tenant.id,
          event_id: form.event_id,
          client_id: clientId,
          client_name: form.name,
          client_phone: form.phone || null,
          status: 'waiting',
        });
      }

      setStep('done');
    } catch (err) {
      console.error('Waiver submission failed:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setSigning(false);
    }
  };

  if (!tenantSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-raised">
        <Card><CardContent className="p-8 text-center text-text-secondary">Invalid waiver link.</CardContent></Card>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-raised">
        <div className="text-text-tertiary">Loading…</div>
      </div>
    );
  }

  const brandColor = tenant.brand_color || 'var(--accent-primary)';

  return (
    <div className="min-h-screen bg-surface-raised px-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Header — shows logo if uploaded, otherwise accent initial */}
        <div className="text-center mb-8">
          {tenant.logo_url && !logoError ? (
            <div className="w-16 h-16 rounded-2xl mx-auto mb-3 overflow-hidden bg-surface-base border border-border-default">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={tenant.logo_url}
                alt={tenant.name}
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white text-2xl font-bold"
              style={{ backgroundColor: brandColor }}
            >
              {tenant.name.charAt(0)}
            </div>
          )}
          <h1 className="text-2xl font-bold text-text-primary font-display">
            {tenant.name}
          </h1>
          <p className="text-text-secondary text-sm mt-1">Waiver & Check-in</p>
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
                label="Phone (for queue notifications)"
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
              {events.length > 0 && (
                <Select
                  label="Event"
                  value={form.event_id}
                  onChange={(e) => setForm({ ...form, event_id: e.target.value })}
                >
                  <option value="">Select event</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                  ))}
                </Select>
              )}

              {/* Waiver Text */}
              <div className="bg-surface-raised rounded-xl p-4 text-sm text-text-primary leading-relaxed max-h-40 overflow-y-auto border border-border-subtle">
                {tenant.waiver_text}
              </div>

              <Button
                variant="primary"
                className="w-full text-lg min-h-[56px]"
                onClick={() => form.name ? setStep('sign') : setError('Please enter your name')}
                style={{ backgroundColor: brandColor }}
              >
                Continue to Sign
              </Button>

              {error && (
                <div className="bg-error-50 text-error-600 text-sm text-center rounded-lg p-3">
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
              <p className="text-text-secondary text-sm text-center">
                Sign below to agree to the waiver
              </p>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
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
                <div className="bg-error-50 text-error-600 text-sm text-center rounded-lg p-3">
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
              <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center bg-success-50">
                <svg className="w-8 h-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-text-primary">All Set!</h2>
              <p className="text-text-secondary">
                Your waiver has been signed.
                {form.event_id && form.phone && " We'll text you when it's your turn."}
                {form.event_id && !form.phone && " You've been added to the queue."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}