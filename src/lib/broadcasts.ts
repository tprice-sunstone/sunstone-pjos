// ============================================================================
// Broadcast Utilities — src/lib/broadcasts.ts
// ============================================================================
// Audience resolution for broadcast targeting. Resolves tag, segment, or
// all-client targets into a list of matching clients.
// ============================================================================

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AudienceClient {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Resolve the target audience for a broadcast.
 *
 * - 'tag'     → clients with the given tag assigned
 * - 'segment' → clients matching the segment's filter_criteria (tag IDs, AND logic)
 * - 'all'     → all clients for the tenant
 */
export async function resolveAudience(
  supabase: SupabaseClient,
  tenantId: string,
  targetType: string,
  targetId: string | null
): Promise<AudienceClient[]> {
  if (targetType === 'all' || !targetId) {
    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    return (data || []) as AudienceClient[];
  }

  if (targetType === 'tag') {
    // Get client IDs that have this tag
    const { data: assignments } = await supabase
      .from('client_tag_assignments')
      .select('client_id')
      .eq('tag_id', targetId);

    const clientIds = (assignments || []).map((a) => a.client_id);
    if (clientIds.length === 0) return [];

    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone')
      .eq('tenant_id', tenantId)
      .in('id', clientIds);
    return (data || []) as AudienceClient[];
  }

  if (targetType === 'segment') {
    // Load segment filter criteria
    const { data: segment } = await supabase
      .from('client_segments')
      .select('filter_criteria')
      .eq('id', targetId)
      .single();

    if (!segment) return [];

    const tagIds: string[] = segment.filter_criteria?.tagIds || [];
    if (tagIds.length === 0) {
      // Segment with no tag filters = all clients
      const { data } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone')
        .eq('tenant_id', tenantId);
      return (data || []) as AudienceClient[];
    }

    // Get clients who have ALL specified tags (AND logic)
    const { data: assignments } = await supabase
      .from('client_tag_assignments')
      .select('client_id, tag_id')
      .in('tag_id', tagIds);

    const clientTagCounts: Record<string, number> = {};
    for (const a of assignments || []) {
      clientTagCounts[a.client_id] = (clientTagCounts[a.client_id] || 0) + 1;
    }

    const matchingIds = Object.entries(clientTagCounts)
      .filter(([, count]) => count >= tagIds.length)
      .map(([id]) => id);

    if (matchingIds.length === 0) return [];

    const { data } = await supabase
      .from('clients')
      .select('id, first_name, last_name, email, phone')
      .eq('tenant_id', tenantId)
      .in('id', matchingIds);
    return (data || []) as AudienceClient[];
  }

  return [];
}
