// ============================================================================
// Email Preview Route — src/app/api/email-preview/route.ts
// ============================================================================
// Renders onboarding and trial email templates in the browser for marketing
// review. Protected: requires platform admin session OR ?key=CRON_SECRET.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyPlatformAdmin, AdminAuthError } from '@/lib/admin/verify-platform-admin';

import {
  onboardingWelcome,
  onboardingInventoryNudge,
  onboardingFirstSaleNudge,
  onboardingWeek1Active,
  onboardingWeek1Inactive,
  onboardingStripeNudge,
  onboardingWeek2Active,
  onboardingWeek2Inactive,
} from '@/lib/emails/onboarding-emails';

import {
  trialEmail7Day,
  trialEmail1Day,
  trialEmailExpired,
} from '@/lib/emails/trial-emails';

// ── Template registry ───────────────────────────────────────────────────────

const TEMPLATES: Record<string, { label: string; day: string; render: () => { subject: string; html: string } }> = {
  welcome: {
    label: 'Welcome',
    day: 'Day 0',
    render: () => onboardingWelcome({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      tenantCreatedAt: new Date(),
    }),
  },
  'inventory-nudge': {
    label: 'Inventory Nudge',
    day: 'Day 2–3',
    render: () => onboardingInventoryNudge({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      tenantCreatedAt: new Date(Date.now() - 2 * 86_400_000),
    }),
  },
  'first-sale': {
    label: 'First Sale Nudge',
    day: 'Day 4–5',
    render: () => onboardingFirstSaleNudge({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      tenantCreatedAt: new Date(Date.now() - 4 * 86_400_000),
    }),
  },
  'week1-active': {
    label: 'Week 1 Active',
    day: 'Day 6–8',
    render: () => onboardingWeek1Active({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      tenantCreatedAt: new Date(Date.now() - 7 * 86_400_000),
    }),
  },
  'week1-inactive': {
    label: 'Week 1 Inactive',
    day: 'Day 6–8',
    render: () => onboardingWeek1Inactive({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      tenantCreatedAt: new Date(Date.now() - 7 * 86_400_000),
    }),
  },
  'stripe-nudge': {
    label: 'Stripe Nudge',
    day: 'Day 9–11',
    render: () => onboardingStripeNudge({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      tenantCreatedAt: new Date(Date.now() - 10 * 86_400_000),
    }),
  },
  'week2-active': {
    label: 'Week 2 Active',
    day: 'Day 13–15',
    render: () => onboardingWeek2Active({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      tenantCreatedAt: new Date(Date.now() - 14 * 86_400_000),
    }),
  },
  'week2-inactive': {
    label: 'Week 2 Inactive',
    day: 'Day 13–15',
    render: () => onboardingWeek2Inactive({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      tenantCreatedAt: new Date(Date.now() - 14 * 86_400_000),
    }),
  },
  'trial-7day': {
    label: 'Trial — 7 Days Left',
    day: 'Day 23',
    render: () => trialEmail7Day({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      daysRemaining: 7,
      trialEndsAt: new Date(Date.now() + 7 * 86_400_000),
    }),
  },
  'trial-1day': {
    label: 'Trial — 1 Day Left',
    day: 'Day 29',
    render: () => trialEmail1Day({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      daysRemaining: 1,
      trialEndsAt: new Date(Date.now() + 86_400_000),
    }),
  },
  'trial-expired': {
    label: 'Trial Expired',
    day: 'Day 31',
    render: () => trialEmailExpired({
      businessName: "Luna's Jewelry",
      ownerEmail: 'luna@example.com',
      ownerFirstName: 'Luna',
      daysRemaining: 0,
      trialEndsAt: new Date(Date.now() - 86_400_000),
    }),
  },
};

// ── Auth check ──────────────────────────────────────────────────────────────

async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Check CRON_SECRET key param
  const key = request.nextUrl.searchParams.get('key');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && key === cronSecret) return true;

  // Check platform admin session
  try {
    await verifyPlatformAdmin();
    return true;
  } catch {
    return false;
  }
}

// ── Index page ──────────────────────────────────────────────────────────────

function renderIndex(keyParam: string): string {
  const rows = Object.entries(TEMPLATES)
    .map(([slug, { label, day }]) => {
      const href = `/api/email-preview?template=${slug}${keyParam}`;
      return `<tr>
        <td style="padding: 10px 16px; border-bottom: 1px solid #F3E8EE;">
          <a href="${href}" style="color: #852454; text-decoration: none; font-weight: 600;">${label}</a>
        </td>
        <td style="padding: 10px 16px; border-bottom: 1px solid #F3E8EE; color: #888;">${day}</td>
      </tr>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Template Preview — Sunstone Studio</title>
</head>
<body style="margin: 0; padding: 40px 16px; background: #FBEEEE; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="padding: 32px; border-bottom: 1px solid #F3E8EE;">
      <h1 style="margin: 0 0 4px; font-size: 22px; color: #852454;">Email Template Preview</h1>
      <p style="margin: 0; color: #888; font-size: 14px;">Click a template to preview it as the recipient would see it.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead>
        <tr>
          <th style="padding: 10px 16px; text-align: left; color: #852454; font-size: 13px; border-bottom: 2px solid #F3E8EE;">Template</th>
          <th style="padding: 10px 16px; text-align: left; color: #852454; font-size: 13px; border-bottom: 2px solid #F3E8EE;">Timing</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

// ── GET handler ─────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const template = request.nextUrl.searchParams.get('template');

  // Preserve key param in index links so marketing stays authenticated
  const key = request.nextUrl.searchParams.get('key');
  const keyParam = key ? `&key=${encodeURIComponent(key)}` : '';

  // No template → show index
  if (!template || !TEMPLATES[template]) {
    return new NextResponse(renderIndex(keyParam), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  const { subject, html } = TEMPLATES[template].render();

  // Wrap with a small header bar showing template name + subject
  const preview = `<!-- Preview header -->
<div style="position: fixed; top: 0; left: 0; right: 0; z-index: 9999; background: #1a1a2e; color: #fff; padding: 8px 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; display: flex; align-items: center; gap: 16px;">
  <a href="/api/email-preview?${key ? 'key=' + encodeURIComponent(key) : ''}" style="color: #F3E8EE; text-decoration: none;">&larr; All Templates</a>
  <span style="color: #888;">|</span>
  <strong>${TEMPLATES[template].label}</strong>
  <span style="color: #888;">Subject: ${subject}</span>
</div>
<div style="padding-top: 40px;">
${html}
</div>`;

  return new NextResponse(preview, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
