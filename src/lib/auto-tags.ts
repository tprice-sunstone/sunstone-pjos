import { createServiceRoleClient } from '@/lib/supabase/server';

interface AutoTagContext {
  type: 'sale' | 'waiver';
  eventId?: string;
  eventName?: string;
}

/**
 * Auto-tag a client based on sale/waiver context.
 * Runs server-side with service role (no RLS).
 */
export async function autoTagClient(
  tenantId: string,
  clientId: string,
  context: AutoTagContext
): Promise<void> {
  const supabase = await createServiceRoleClient();

  // Fetch or seed auto-tags for this tenant
  let { data: autoTags } = await supabase
    .from('client_tags')
    .select('id, name, auto_apply_rule')
    .eq('tenant_id', tenantId)
    .eq('auto_apply', true);

  if (!autoTags || autoTags.length === 0) {
    // Seed default auto-tags
    await supabase.from('client_tags').insert([
      { tenant_id: tenantId, name: 'New Client', color: '#6366F1', auto_apply: true, auto_apply_rule: 'new_client' },
      { tenant_id: tenantId, name: 'Repeat Client', color: '#059669', auto_apply: true, auto_apply_rule: 'repeat_client' },
    ]);
    const { data: seeded } = await supabase
      .from('client_tags')
      .select('id, name, auto_apply_rule')
      .eq('tenant_id', tenantId)
      .eq('auto_apply', true);
    autoTags = seeded || [];
  }

  // Count client's completed sales
  const { count: salesCount } = await supabase
    .from('sales')
    .select('id', { count: 'exact', head: true })
    .eq('client_id', clientId)
    .eq('status', 'completed');

  const totalSales = salesCount || 0;

  const tagsToApply: string[] = [];

  for (const tag of autoTags) {
    if (tag.auto_apply_rule === 'new_client' && totalSales <= 1) {
      tagsToApply.push(tag.id);
    }
    if (tag.auto_apply_rule === 'repeat_client' && totalSales >= 2) {
      tagsToApply.push(tag.id);
    }
  }

  // Event attendance tag
  if (context.eventName) {
    // Find or create event tag
    const tagName = context.eventName;
    let { data: eventTag } = await supabase
      .from('client_tags')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('name', tagName)
      .single();

    if (!eventTag) {
      const { data: created } = await supabase
        .from('client_tags')
        .insert({ tenant_id: tenantId, name: tagName, color: '#7C3AED', auto_apply: false })
        .select('id')
        .single();
      eventTag = created;
    }

    if (eventTag) tagsToApply.push(eventTag.id);
  }

  // Apply tags (skip if already assigned)
  for (const tagId of tagsToApply) {
    const { data: existing } = await supabase
      .from('client_tag_assignments')
      .select('id')
      .eq('client_id', clientId)
      .eq('tag_id', tagId)
      .single();

    if (!existing) {
      await supabase.from('client_tag_assignments').insert({
        client_id: clientId,
        tag_id: tagId,
      });
    }
  }

  // If it's a "repeat_client" scenario, remove "New Client" tag
  if (totalSales >= 2) {
    const newClientTag = autoTags.find((t) => t.auto_apply_rule === 'new_client');
    if (newClientTag) {
      await supabase
        .from('client_tag_assignments')
        .delete()
        .eq('client_id', clientId)
        .eq('tag_id', newClientTag.id);
    }
  }

  // Update last_visit_at for sale context
  if (context.type === 'sale') {
    await supabase
      .from('clients')
      .update({ last_visit_at: new Date().toISOString() })
      .eq('id', clientId);
  }
}
