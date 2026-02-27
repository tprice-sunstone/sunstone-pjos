'use client';

import { useRouter } from 'next/navigation';

export function WelcomeCard({ tenantName }: { tenantName: string }) {
  const router = useRouter();

  const steps = [
    { label: 'Add your inventory', route: '/dashboard/inventory' },
    { label: 'Create an event', route: '/dashboard/events' },
    { label: 'Make your first sale', route: '/dashboard/pos' },
  ];

  return (
    <div
      className="col-span-full border border-[var(--border-default)]"
      style={{
        borderRadius: 'var(--card-radius, 16px)',
        boxShadow: 'var(--shadow-card)',
        padding: 24,
        background: 'linear-gradient(135deg, var(--accent-50), var(--surface-raised))',
      }}
    >
      <p
        className="text-text-primary"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: 18,
          fontWeight: 600,
        }}
      >
        Welcome to Sunstone, {tenantName}!
      </p>
      <p className="text-text-secondary" style={{ fontSize: 13, marginTop: 4 }}>
        Here are a few things to get you started:
      </p>

      <div
        className="grid grid-cols-1 sm:grid-cols-3"
        style={{ gap: 10, marginTop: 16 }}
      >
        {steps.map((step) => (
          <button
            key={step.route}
            onClick={() => router.push(step.route)}
            className="text-left bg-[var(--surface-raised)] border border-[var(--border-default)] hover:border-accent-200 hover:bg-accent-50 transition-colors"
            style={{ borderRadius: 10, padding: '10px 14px', cursor: 'pointer' }}
          >
            <span className="text-text-primary" style={{ fontSize: 12, fontWeight: 500 }}>
              {step.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
