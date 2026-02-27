'use client';

import { useRouter } from 'next/navigation';

export function WelcomeCard({ tenantName }: { tenantName: string }) {
  const router = useRouter();

  const steps = [
    { label: 'Add your inventory', route: '/dashboard/inventory', icon: PackageIcon },
    { label: 'Create an event', route: '/dashboard/events', icon: CalendarIcon },
    { label: 'Make your first sale', route: '/dashboard/pos', icon: StorefrontIcon },
  ];

  return (
    <div className="col-span-full rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-sm p-6 lg:p-8">
      <div className="flex items-start gap-4">
        <div className="shrink-0 w-12 h-12 rounded-xl bg-accent-50 flex items-center justify-center">
          <SparkleIcon className="w-6 h-6 text-accent-600" />
        </div>
        <div className="flex-1">
          <h2
            className="text-lg font-semibold text-text-primary"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Welcome to Sunstone, {tenantName}!
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Here are a few things to get you started:
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {steps.map((step) => (
              <button
                key={step.route}
                onClick={() => router.push(step.route)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[var(--border-default)] bg-[var(--surface-base)] hover:bg-accent-50 hover:border-accent-200 transition-colors text-left group"
              >
                <step.icon className="w-5 h-5 text-text-tertiary group-hover:text-accent-600 transition-colors" />
                <span className="text-sm font-medium text-text-primary">{step.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline icons
function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  );
}

function PackageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
    </svg>
  );
}
