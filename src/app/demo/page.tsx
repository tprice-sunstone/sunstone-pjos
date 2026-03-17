// src/app/demo/page.tsx
// Kiosk launcher — 3 persona cards with one-click login

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { PERSONAS, type PersonaKey } from '@/lib/demo/personas';
import { toast } from 'sonner';

interface Credentials {
  key: PersonaKey;
  email: string;
  password: string;
  tenantId: string;
}

export default function DemoPage() {
  const router = useRouter();
  const [credentials, setCredentials] = useState<Credentials[]>([]);
  const [loading, setLoading] = useState<PersonaKey | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch('/api/demo/credentials')
      .then((r) => {
        if (!r.ok) throw new Error('Demo not enabled');
        return r.json();
      })
      .then((data) => {
        setCredentials(data.personas || []);
        setReady(true);
      })
      .catch(() => {
        setReady(true);
      });
  }, []);

  async function handleLogin(personaKey: PersonaKey) {
    const cred = credentials.find((c) => c.key === personaKey);
    if (!cred || !cred.email || !cred.password) {
      toast.error('Demo accounts not configured yet.');
      return;
    }

    setLoading(personaKey);
    try {
      const supabase = createClient();

      // Sign out any existing session first
      await supabase.auth.signOut();

      const { error } = await supabase.auth.signInWithPassword({
        email: cred.email,
        password: cred.password,
      });

      if (error) throw error;

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      console.error('Demo login failed:', err);
      toast.error(err.message || 'Demo login failed. Check account configuration.');
      setLoading(null);
    }
  }

  const personaOrder: PersonaKey[] = ['newbie', 'mid', 'pro'];

  const accentClasses: Record<string, { border: string; bg: string; badge: string }> = {
    emerald: {
      border: 'border-emerald-400',
      bg: 'bg-emerald-500 hover:bg-emerald-600',
      badge: 'bg-emerald-500/20 text-emerald-300',
    },
    violet: {
      border: 'border-violet-400',
      bg: 'bg-violet-500 hover:bg-violet-600',
      badge: 'bg-violet-500/20 text-violet-300',
    },
    amber: {
      border: 'border-amber-400',
      bg: 'bg-amber-500 hover:bg-amber-600',
      badge: 'bg-amber-500/20 text-amber-300',
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-10">
        <Image
          src="/landing/sunstone-logo.webp"
          alt="Sunstone"
          width={56}
          height={56}
          className="mx-auto mb-4"
          style={{ borderRadius: 12 }}
        />
        <h1 className="text-3xl font-semibold text-white tracking-tight" style={{ fontFamily: 'var(--font-display)' }}>
          Sunstone Studio
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Tap a profile to explore the platform
        </p>
      </div>

      {/* Persona cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        {personaOrder.map((key) => {
          const persona = PERSONAS[key];
          const colors = accentClasses[persona.accent];
          const isLoading = loading === key;
          const isDisabled = loading !== null;

          return (
            <button
              key={key}
              onClick={() => handleLogin(key)}
              disabled={isDisabled || !ready}
              className={`
                relative text-left rounded-xl border-t-4 ${colors.border}
                bg-slate-800/80 backdrop-blur p-6 transition-all
                hover:bg-slate-700/80 hover:scale-[1.02]
                active:scale-[0.98]
                disabled:opacity-60 disabled:cursor-not-allowed
                min-h-[200px]
              `}
            >
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/90 rounded-xl z-10">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}

              <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${colors.badge} mb-3`}>
                {persona.badge}
              </span>

              <h2 className="text-xl font-semibold text-white mb-1">
                {persona.name}
              </h2>

              <p className="text-sm text-slate-400 mb-3">
                {persona.stats}
              </p>

              <p className="text-sm text-slate-300 mb-4 leading-relaxed">
                {persona.description}
              </p>

              <div className="text-xs text-slate-500">
                {persona.explore}
              </div>

              <div className={`mt-4 w-full py-3 rounded-lg text-center text-sm font-semibold text-white ${colors.bg} transition-colors`}>
                {isLoading ? 'Signing in...' : `Explore ${persona.name.split(' ')[0]}'s Account`}
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-slate-600 text-xs mt-10">
        Sunstone Studio — The business platform for permanent jewelry artists
      </p>
    </div>
  );
}
