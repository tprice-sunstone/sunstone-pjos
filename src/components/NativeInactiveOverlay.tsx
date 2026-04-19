'use client';

import { NATIVE_SUPPORT_EMAIL, NATIVE_INACTIVE_MESSAGE } from '@/lib/billing-gate';
import { createClient } from '@/lib/supabase/client';

interface NativeInactiveOverlayProps {
  className?: string;
}

export default function NativeInactiveOverlay({ className }: NativeInactiveOverlayProps) {
  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth/login';
  };

  return (
    <div className={`fixed inset-0 z-[200] bg-[var(--surface-base)]/95 backdrop-blur-sm flex items-center justify-center p-4 ${className || ''}`}>
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Lock icon */}
        <div className="w-16 h-16 rounded-full bg-[var(--accent-50)] flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-[var(--accent-500)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>

        <div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>
            Account Inactive
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            {NATIVE_INACTIVE_MESSAGE}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href={`mailto:${NATIVE_SUPPORT_EMAIL}`}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            Contact Support
          </a>
          <button
            onClick={handleSignOut}
            className="text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
