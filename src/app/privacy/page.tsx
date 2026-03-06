// ============================================================================
// Privacy Policy — src/app/privacy/page.tsx
// ============================================================================
// Public page. Includes SMS/text messaging section for A2P 10DLC compliance.
// ============================================================================

import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';

export const metadata: Metadata = {
  title: 'Privacy Policy — Sunstone Studio',
  description: 'How Sunstone Studio collects, uses, and protects your information, including our SMS messaging practices.',
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#fafaf9' }}>
      {/* Header */}
      <header style={{ padding: '20px 24px', borderBottom: '1px solid #e7e5e4', background: '#fff' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#1c1917' }}>
            <Image src="/landing/sunstone-logo.webp" alt="Sunstone Studio" width={32} height={32} style={{ borderRadius: 6 }} />
            <span style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: 16 }}>Sunstone Studio</span>
          </Link>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/terms" style={{ fontSize: 14, color: '#78716c', textDecoration: 'none' }}>Terms</Link>
            <Link href="/auth/login" style={{ fontSize: 14, color: '#78716c', textDecoration: 'none' }}>Log In</Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px 80px' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, color: '#1c1917', marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 14, color: '#a8a29e', marginBottom: 40 }}>Last updated: March 2026</p>

        <div style={{ fontSize: 15.5, lineHeight: 1.75, color: '#44403c' }} className="legal-content">

          {/* 1. Introduction */}
          <Section title="1. Introduction">
            <p>
              Sunstone Studio (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;) operates the sunstonepj.app platform, a business management
              tool for permanent jewelry service providers. This Privacy Policy describes how we collect, use, disclose, and
              protect information obtained from users of our platform (service providers) and their end consumers (customers).
            </p>
            <p>
              By using Sunstone Studio or interacting with a business that uses our platform, you agree to the practices
              described in this policy.
            </p>
          </Section>

          {/* 2. Information We Collect */}
          <Section title="2. Information We Collect">
            <p><strong>From service providers (account holders):</strong></p>
            <ul>
              <li>Account information: name, email address, phone number, business name, and business details</li>
              <li>Payment information: billing details processed through Stripe (we do not store full card numbers)</li>
              <li>Usage data: how you interact with the platform, pages visited, features used</li>
            </ul>
            <p><strong>From end consumers (customers of service providers):</strong></p>
            <ul>
              <li>Contact information: name, phone number, and email address provided through digital waivers, check-in forms, or point-of-sale transactions</li>
              <li>Waiver and consent records: signed liability waivers and SMS consent preferences</li>
              <li>Transaction data: purchase history, payment records, gift card information</li>
              <li>Communication data: SMS message content exchanged with service providers through our platform</li>
            </ul>
          </Section>

          {/* 3. SMS/Text Messaging */}
          <Section title="3. SMS/Text Messaging">
            <p>
              We facilitate text message communications between service providers and their customers through our platform.
              The following applies to SMS/text messaging services:
            </p>
            <ul>
              <li>
                <strong>Consent:</strong> We send text messages to end consumers who have explicitly opted in by providing their
                phone number and checking a separate SMS consent checkbox on a digital waiver or check-in form. SMS consent is
                obtained independently from any waiver or liability consent.
              </li>
              <li>
                <strong>Message types:</strong> Queue position updates, service-ready notifications, digital receipts,
                aftercare instructions, appointment reminders, follow-up messages, and promotional messages (if separately consented).
              </li>
              <li>
                <strong>Message frequency:</strong> Varies by interaction. Transactional messages typically range from
                1&ndash;5 messages per service visit. Marketing or follow-up messages are sent at the discretion of the
                service provider, subject to applicable regulations.
              </li>
              <li>
                <strong>Message and data rates:</strong> Standard message and data rates may apply depending on your mobile
                carrier and plan.
              </li>
              <li>
                <strong>Opt-out:</strong> You may opt out of text messages at any time by replying <strong>STOP</strong> to
                any message received from our platform. You will receive a confirmation message and no further texts will be sent.
              </li>
              <li>
                <strong>Help:</strong> For assistance with text messages, reply <strong>HELP</strong> to any message or
                contact us at <a href="mailto:support@sunstonepj.app" style={{ color: '#c2185b' }}>support@sunstonepj.app</a>.
              </li>
              <li>
                <strong>No sharing:</strong> We do not sell, rent, or share phone numbers or SMS consent data with third
                parties for their marketing purposes.
              </li>
              <li>
                <strong>Not required for purchase:</strong> Providing SMS consent is not required as a condition of purchasing
                any goods or services.
              </li>
            </ul>
          </Section>

          {/* 4. How We Use Your Information */}
          <Section title="4. How We Use Your Information">
            <p>We use collected information to:</p>
            <ul>
              <li>Provide, maintain, and improve the Sunstone Studio platform</li>
              <li>Process payments and manage subscriptions</li>
              <li>Send transactional notifications (queue updates, receipts, aftercare instructions)</li>
              <li>Facilitate communications between service providers and their customers</li>
              <li>Provide customer support</li>
              <li>Analyze usage patterns to improve our services</li>
              <li>Comply with legal obligations</li>
            </ul>
          </Section>

          {/* 5. Data Sharing */}
          <Section title="5. Data Sharing">
            <p>
              We share data with third-party service providers only as necessary to operate the platform:
            </p>
            <ul>
              <li><strong>Stripe</strong> — for payment processing and subscription billing</li>
              <li><strong>Twilio</strong> — for SMS/text message delivery and phone number services</li>
              <li><strong>Resend</strong> — for transactional email delivery</li>
              <li><strong>Supabase</strong> — for secure data storage and authentication</li>
              <li><strong>Vercel</strong> — for application hosting</li>
              <li><strong>Anthropic</strong> — for AI-powered features (Sunny AI mentor)</li>
            </ul>
            <p>
              We do not sell personal data to third parties. We may disclose information if required by law, court order,
              or to protect the rights, property, or safety of our users or the public.
            </p>
          </Section>

          {/* 6. Data Security */}
          <Section title="6. Data Security">
            <p>
              We implement industry-standard security measures to protect your information, including:
            </p>
            <ul>
              <li>Encryption of data in transit (TLS/SSL) and at rest</li>
              <li>Secure authentication with password hashing and session management</li>
              <li>Row-level security (RLS) on all database tables ensuring tenant data isolation</li>
              <li>Regular security reviews and monitoring</li>
            </ul>
            <p>
              While we take reasonable precautions, no method of electronic transmission or storage is 100% secure.
              We cannot guarantee absolute security of your data.
            </p>
          </Section>

          {/* 7. Data Retention */}
          <Section title="7. Data Retention">
            <p>
              We retain account and transaction data for the duration of the service provider&rsquo;s subscription and
              for a reasonable period afterward to comply with legal and business requirements. Waiver records and consent
              data are retained as required by applicable law. You may request deletion of your data at any time.
            </p>
          </Section>

          {/* 8. Your Rights */}
          <Section title="8. Your Rights">
            <p>You have the right to:</p>
            <ul>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data (subject to legal retention requirements)</li>
              <li>Opt out of marketing communications</li>
              <li>Opt out of SMS messages by replying STOP</li>
            </ul>
            <p>
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@sunstonepj.app" style={{ color: '#c2185b' }}>support@sunstonepj.app</a>.
            </p>
          </Section>

          {/* 9. Children's Privacy */}
          <Section title="9. Children's Privacy">
            <p>
              Sunstone Studio is not directed to children under 13. We do not knowingly collect personal information
              from children under 13. If you believe we have collected such information, please contact us immediately.
            </p>
          </Section>

          {/* 10. Changes */}
          <Section title="10. Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify registered users of material changes
              via email or through the platform. Your continued use of the platform after changes constitutes acceptance.
            </p>
          </Section>

          {/* 11. Contact */}
          <Section title="11. Contact Us">
            <p>
              If you have questions about this Privacy Policy or our data practices, contact us at:
            </p>
            <p>
              <strong>Sunstone Studio</strong><br />
              Email: <a href="mailto:support@sunstonepj.app" style={{ color: '#c2185b' }}>support@sunstonepj.app</a><br />
              Website: <a href="https://sunstonepj.app" style={{ color: '#c2185b' }}>sunstonepj.app</a>
            </p>
          </Section>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '24px', borderTop: '1px solid #e7e5e4', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#a8a29e' }}>
          &copy; {new Date().getFullYear()} Sunstone Studio &middot;{' '}
          <Link href="/terms" style={{ color: '#a8a29e', textDecoration: 'underline' }}>Terms of Service</Link>
          {' '}&middot;{' '}
          <Link href="/" style={{ color: '#a8a29e', textDecoration: 'underline' }}>Home</Link>
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 600, color: '#1c1917', marginBottom: 12 }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </section>
  );
}
