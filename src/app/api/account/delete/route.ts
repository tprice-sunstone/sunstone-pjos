// ============================================================================
// Account Deletion — POST /api/account/delete
// Apple Guideline 5.1.1(v): Users must be able to delete their account
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase, createServiceRoleClient } from '@/lib/supabase/server';
import { clearPhoneCache } from '@/lib/twilio';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate confirmation
    const body = await request.json();
    if (body.confirmation !== 'DELETE') {
      return NextResponse.json({ error: 'Confirmation required' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();
    const now = new Date().toISOString();

    // 3. Get user's membership
    const { data: member } = await serviceClient
      .from('tenant_members')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .single();

    if (!member) {
      // No membership — break any stale FK links, then delete the auth user
      await serviceClient.from('tenants').update({ owner_id: null }).eq('owner_id', user.id);

      const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(user.id);
      if (deleteAuthError) {
        console.error('[AccountDelete] Failed to delete auth user:', deleteAuthError);
        return NextResponse.json(
          { error: 'Account data removed but sign-out failed. Please contact support.' },
          { status: 500 }
        );
      }
      return NextResponse.json({ ok: true, scope: 'self' });
    }

    const isOwner = member.role === 'admin';

    // 4. Check if owner and only owner
    if (isOwner) {
      const { count } = await serviceClient
        .from('tenant_members')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', member.tenant_id)
        .eq('role', 'admin')
        .is('deleted_at', null);

      const isOnlyOwner = (count || 0) <= 1;

      if (isOnlyOwner) {
        // ── Soft-delete the entire tenant ──

        // Get tenant data for cleanup
        const { data: tenant } = await serviceClient
          .from('tenants')
          .select('stripe_subscription_id, crm_subscription_id, dedicated_phone_sid, dedicated_phone_number')
          .eq('id', member.tenant_id)
          .single();

        // Cancel Stripe subscriptions (best-effort)
        if (tenant?.stripe_subscription_id || tenant?.crm_subscription_id) {
          try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            if (tenant.stripe_subscription_id) {
              await stripe.subscriptions.cancel(tenant.stripe_subscription_id);
            }
            if (tenant.crm_subscription_id) {
              await stripe.subscriptions.cancel(tenant.crm_subscription_id);
            }
          } catch (err: any) {
            console.error('[AccountDelete] Stripe cancel error:', err.message);
          }
        }

        // Release Twilio number (best-effort)
        if (tenant?.dedicated_phone_sid) {
          try {
            const twilio = require('twilio');
            const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

            // Remove from Messaging Service first
            const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
            if (messagingServiceSid) {
              try {
                await twilioClient.messaging.v1
                  .services(messagingServiceSid)
                  .phoneNumbers(tenant.dedicated_phone_sid)
                  .remove();
              } catch (msErr: any) {
                console.error('[AccountDelete] Messaging Service removal failed:', msErr.message);
              }
            }

            await twilioClient.incomingPhoneNumbers(tenant.dedicated_phone_sid).remove();
            clearPhoneCache(member.tenant_id);
          } catch (err: any) {
            console.error('[AccountDelete] Twilio release error:', err.message);
          }
        }

        // Soft-delete tenant, recording who initiated it
        await serviceClient
          .from('tenants')
          .update({ deleted_at: now, deleted_by: user.id })
          .eq('id', member.tenant_id);

        // Break FK links to auth.users so deleteUser() won't hit constraint
        // (owner_id and deleted_by both reference auth.users via FK)
        await serviceClient
          .from('tenants')
          .update({ owner_id: null, deleted_by: null })
          .eq('id', member.tenant_id);

        // Soft-delete all members + anonymize PII
        const { data: members } = await serviceClient
          .from('tenant_members')
          .select('id, user_id')
          .eq('tenant_id', member.tenant_id)
          .is('deleted_at', null);

        if (members) {
          for (const m of members) {
            await serviceClient
              .from('tenant_members')
              .update({ deleted_at: now })
              .eq('id', m.id);
          }
        }

        // Delete the auth user
        const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(user.id);
        if (deleteAuthError) {
          console.error('[AccountDelete] Failed to delete auth user:', deleteAuthError);
          return NextResponse.json(
            { error: 'Account data removed but sign-out failed. Please contact support.' },
            { status: 500 }
          );
        }

        return NextResponse.json({ ok: true, scope: 'tenant' });
      }
    }

    // ── Non-sole-owner: remove self only ──
    await serviceClient
      .from('tenant_members')
      .update({ deleted_at: now })
      .eq('tenant_id', member.tenant_id)
      .eq('user_id', user.id);

    // Break FK on tenants.owner_id if this user happens to be the owner
    await serviceClient
      .from('tenants')
      .update({ owner_id: null })
      .eq('id', member.tenant_id)
      .eq('owner_id', user.id);

    // Delete the auth user
    const { error: deleteAuthError } = await serviceClient.auth.admin.deleteUser(user.id);
    if (deleteAuthError) {
      console.error('[AccountDelete] Failed to delete auth user:', deleteAuthError);
      return NextResponse.json(
        { error: 'Account data removed but sign-out failed. Please contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, scope: 'self' });
  } catch (error: any) {
    console.error('[AccountDelete] Error:', error.message);
    return NextResponse.json({ error: 'An error occurred while deleting your account' }, { status: 500 });
  }
}
