// src/components/DemoBanner.tsx
// Fixed amber banner shown when logged in as a demo account

'use client';

import { useState } from 'react';
import { useTenant } from '@/hooks/use-tenant';
import { getPersonaKey, PERSONAS } from '@/lib/demo/personas';
import { toast } from 'sonner';

export default function DemoBanner() {
  const { tenant } = useTenant();
  const [resetting, setResetting] = useState(false);

  if (!tenant) return null;

  const personaKey = getPersonaKey(tenant.id);
  if (!personaKey) return null;

  const persona = PERSONAS[personaKey];

  async function handleReset() {
    if (!window.confirm('Reset all demo data? This will restore the original sample data for this account.')) {
      return;
    }

    setResetting(true);
    try {
      const res = await fetch('/api/demo/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: tenant!.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Reset failed');
      }

      toast.success('Demo data restored');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset demo data');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="shrink-0 flex items-center justify-between px-4 h-9 bg-amber-500 text-white text-sm font-medium z-50">
      <span>DEMO MODE — {persona.name}</span>
      <button
        onClick={handleReset}
        disabled={resetting}
        className="px-3 py-1 rounded text-xs font-semibold bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
      >
        {resetting ? 'Resetting...' : 'Reset Demo Data'}
      </button>
    </div>
  );
}
