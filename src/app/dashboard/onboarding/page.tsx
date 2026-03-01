'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OldOnboardingRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/onboarding');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--surface-base)]">
      <div className="text-text-tertiary">Redirecting...</div>
    </div>
  );
}
