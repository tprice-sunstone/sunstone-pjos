// ============================================================================
// Public Artist Profile — /studio/[slug]
// ============================================================================
// Server component for generateMetadata() SEO, renders ProfilePage client component.
// ============================================================================

import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';
import ProfilePage from './ProfilePage';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServiceRoleClient();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, bio, city, state, logo_url')
    .eq('slug', slug)
    .single();

  if (!tenant) {
    return { title: 'Studio Not Found' };
  }

  const location = [tenant.city, tenant.state].filter(Boolean).join(', ');
  const description = tenant.bio || `${tenant.name}${location ? ` — ${location}` : ''} — Permanent Jewelry Artist`;

  return {
    title: `${tenant.name} — Permanent Jewelry`,
    description,
    openGraph: {
      title: tenant.name,
      description,
      ...(tenant.logo_url ? { images: [{ url: tenant.logo_url }] } : {}),
    },
  };
}

export default async function StudioPage({ params }: PageProps) {
  const { slug } = await params;
  return <ProfilePage slug={slug} />;
}
