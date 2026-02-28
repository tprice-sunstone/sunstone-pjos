'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function TemplatesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/broadcasts?tab=templates');
  }, [router]);
  return null;
}
