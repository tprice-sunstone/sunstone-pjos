// ============================================================================
// Party RSVP Page — /studio/[slug]/party/[partyId]
// ============================================================================

import type { Metadata } from 'next';
import { createServiceRoleClient } from '@/lib/supabase/server';
import RsvpPage from './RsvpPage';

interface PageProps {
  params: Promise<{ slug: string; partyId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { partyId } = await params;
  const supabase = await createServiceRoleClient();

  const { data: party } = await supabase
    .from('party_requests')
    .select('host_name, occasion, tenant_id')
    .eq('id', partyId)
    .single();

  if (!party) return { title: 'Party Not Found' };

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', party.tenant_id)
    .single();

  const title = party.occasion
    ? `${party.host_name}'s ${party.occasion} — RSVP`
    : `${party.host_name}'s Party — RSVP`;

  return {
    title,
    description: `RSVP for ${party.host_name}'s permanent jewelry party${tenant ? ` with ${tenant.name}` : ''}`,
  };
}

export default async function PartyRsvpPage({ params }: PageProps) {
  const { slug, partyId } = await params;
  return <RsvpPage slug={slug} partyId={partyId} />;
}
