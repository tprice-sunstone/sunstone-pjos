// src/app/demo/setup/page.tsx
// Admin setup instructions page for demo system

'use client';

import { useState } from 'react';
import { PERSONAS, type PersonaKey } from '@/lib/demo/personas';
import { toast } from 'sonner';

export default function DemoSetupPage() {
  const [testingPersona, setTestingPersona] = useState<PersonaKey | null>(null);

  const envStatus = {
    newbieTenant: process.env.NEXT_PUBLIC_DEMO_NEWBIE_TENANT_ID || '',
    midTenant: process.env.NEXT_PUBLIC_DEMO_MID_TENANT_ID || '',
    proTenant: process.env.NEXT_PUBLIC_DEMO_PRO_TENANT_ID || '',
  };

  async function testReset(key: PersonaKey) {
    const tenantId = key === 'newbie'
      ? envStatus.newbieTenant
      : key === 'mid'
        ? envStatus.midTenant
        : envStatus.proTenant;

    if (!tenantId) {
      toast.error(`Tenant ID not set for ${key}. Add NEXT_PUBLIC_DEMO_${key.toUpperCase()}_TENANT_ID to your env.`);
      return;
    }

    setTestingPersona(key);
    try {
      const res = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Reset failed');
      }

      toast.success(`${PERSONAS[key].name} reset! ${data.counts.clients} clients, ${data.counts.sales} sales`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setTestingPersona(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Demo System Setup</h1>

      {/* Step 1 */}
      <section className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Step 1: Create Demo Accounts</h2>
        <p className="text-sm text-slate-600 mb-4">
          Create 3 Supabase auth users and onboard each one through the signup flow. Use these credentials:
        </p>
        <div className="space-y-2 text-sm">
          {(['newbie', 'mid', 'pro'] as const).map((key) => (
            <div key={key} className="flex items-center gap-3 p-2 bg-slate-50 rounded">
              <span className="font-medium w-16">{key}</span>
              <code className="text-xs text-slate-500">
                DEMO_{key.toUpperCase()}_EMAIL / DEMO_{key.toUpperCase()}_PASSWORD
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2 */}
      <section className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Step 2: Set Tenant IDs</h2>
        <p className="text-sm text-slate-600 mb-4">
          After creating accounts, get each tenant UUID from the Supabase dashboard and add to your env:
        </p>
        <div className="space-y-3">
          {([
            ['newbie', envStatus.newbieTenant],
            ['mid', envStatus.midTenant],
            ['pro', envStatus.proTenant],
          ] as const).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between p-2 bg-slate-50 rounded text-sm">
              <code>NEXT_PUBLIC_DEMO_{key.toUpperCase()}_TENANT_ID</code>
              {val ? (
                <span className="text-emerald-600 font-medium">Set</span>
              ) : (
                <span className="text-red-500 font-medium">Not set</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Step 3 */}
      <section className="bg-white rounded-lg border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Step 3: Test Reset</h2>
        <p className="text-sm text-slate-600 mb-4">
          Test the reset endpoint for each persona. This will delete all data and re-insert seed data.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {(['newbie', 'mid', 'pro'] as const).map((key) => (
            <button
              key={key}
              onClick={() => testReset(key)}
              disabled={testingPersona !== null}
              className="px-4 py-3 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {testingPersona === key ? 'Resetting...' : `Reset ${PERSONAS[key].name}`}
            </button>
          ))}
        </div>
      </section>

      {/* Step 4 */}
      <section className="bg-white rounded-lg border p-6">
        <h2 className="text-lg font-semibold mb-3">Step 4: Launch Kiosk</h2>
        <p className="text-sm text-slate-600">
          Navigate to <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">/demo</code> to see the kiosk launcher page.
          For fullscreen kiosk mode, use Chrome with <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">--kiosk</code> flag.
        </p>
      </section>
    </div>
  );
}
