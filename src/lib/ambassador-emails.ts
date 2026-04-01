// ============================================================================
// Ambassador Email Notifications — src/lib/ambassador-emails.ts
// ============================================================================
// Fire-and-forget email notifications for ambassador lifecycle events.
// Uses Resend with dynamic import to avoid cold-start overhead.
// ============================================================================

const FROM = () => `Sunstone <${process.env.RESEND_FROM_EMAIL || 'noreply@sunstonepj.app'}>`;

/**
 * Notify ambassador that someone signed up via their referral link.
 */
export async function sendReferralSignupEmail(params: {
  ambassadorEmail: string;
  ambassadorName: string;
  referralCode: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM(),
      to: params.ambassadorEmail,
      subject: 'New Referral Signup!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a1a;">Someone signed up with your link!</h2>
          <p style="color: #555; line-height: 1.6;">Hi ${params.ambassadorName.split(' ')[0]},</p>
          <p style="color: #555; line-height: 1.6;">A new artist just signed up for Sunstone Studio using your referral code <strong>${params.referralCode}</strong>. They're now in their free trial.</p>
          <p style="color: #555; line-height: 1.6;">When they subscribe to a paid plan, you'll start earning 20% monthly commission for 8 months.</p>
          <p style="color: #999; font-size: 14px; margin-top: 32px;">Keep sharing your link to earn more commissions!</p>
          <p style="color: #999;">— The Sunstone Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.warn('[Ambassador Email] Signup notification failed:', err);
  }
}

/**
 * Notify ambassador that a referral converted to a paid plan.
 */
export async function sendReferralConvertedEmail(params: {
  ambassadorEmail: string;
  ambassadorName: string;
  commissionAmount: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM(),
      to: params.ambassadorEmail,
      subject: 'Referral Converted — Commission Earned!',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a1a;">Your referral just subscribed!</h2>
          <p style="color: #555; line-height: 1.6;">Hi ${params.ambassadorName.split(' ')[0]},</p>
          <p style="color: #555; line-height: 1.6;">Great news — one of your referrals just converted to a paid plan. Your first commission has been earned:</p>
          <div style="background: #FDF2F6; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="color: #B1275E; font-size: 28px; font-weight: 700; margin: 0;">$${params.commissionAmount.toFixed(2)}</p>
            <p style="color: #555; font-size: 14px; margin: 4px 0 0;">commission earned this month</p>
          </div>
          <p style="color: #555; line-height: 1.6;">You'll continue earning 20% of their monthly subscription for 8 months. Commissions are paid out on the 15th of each month (minimum $25).</p>
          <p style="color: #999; margin-top: 32px;">— The Sunstone Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.warn('[Ambassador Email] Conversion notification failed:', err);
  }
}

/**
 * Notify ambassador that a payout has been processed.
 */
export async function sendPayoutProcessedEmail(params: {
  ambassadorEmail: string;
  ambassadorName: string;
  payoutAmount: number;
  commissionCount: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    await resend.emails.send({
      from: FROM(),
      to: params.ambassadorEmail,
      subject: `Payout Sent — $${params.payoutAmount.toFixed(2)}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1a1a1a;">Your payout is on the way!</h2>
          <p style="color: #555; line-height: 1.6;">Hi ${params.ambassadorName.split(' ')[0]},</p>
          <p style="color: #555; line-height: 1.6;">Your ${monthLabel} ambassador payout has been processed and sent to your connected bank account.</p>
          <div style="background: #F0FDF4; border-radius: 12px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="color: #15803D; font-size: 28px; font-weight: 700; margin: 0;">$${params.payoutAmount.toFixed(2)}</p>
            <p style="color: #555; font-size: 14px; margin: 4px 0 0;">${params.commissionCount} commission${params.commissionCount !== 1 ? 's' : ''} included</p>
          </div>
          <p style="color: #555; line-height: 1.6; font-size: 14px;">Funds typically arrive in 2-3 business days. You can view your payout history and tax documents in your ambassador dashboard.</p>
          <p style="color: #999; margin-top: 32px;">— The Sunstone Team</p>
        </div>
      `,
    });
  } catch (err) {
    console.warn('[Ambassador Email] Payout notification failed:', err);
  }
}
