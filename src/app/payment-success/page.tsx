// ============================================================================
// Payment Success — /payment-success
// ============================================================================
// Public thank-you page shown on the customer's phone after Stripe Checkout
// completes. No auth required — this is the success_url redirect target.
// ============================================================================

export default function PaymentSuccessPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: '50%',
          backgroundColor: '#ecfdf5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 12.75L11.25 15 15 9.75" />
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
          </svg>
        </div>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#1f2937',
          marginBottom: '8px',
          marginTop: 0,
        }}>
          Payment Complete!
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          lineHeight: 1.5,
          margin: 0,
        }}>
          Your payment was received. You're all set!
        </p>
      </div>
    </div>
  );
}
