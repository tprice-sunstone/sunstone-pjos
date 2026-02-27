'use client';

import { useRouter } from 'next/navigation';
import type { DashboardCard as DashboardCardType } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Card style config per type
// ─────────────────────────────────────────────────────────────────────────────

const CARD_STYLES: Record<
  DashboardCardType['type'],
  { iconBg: string; iconColor: string; accentBorder: string }
> = {
  next_event: {
    iconBg: 'bg-accent-50',
    iconColor: 'text-accent-600',
    accentBorder: 'border-l-[var(--accent-500)]',
  },
  revenue_snapshot: {
    iconBg: 'bg-success-50',
    iconColor: 'text-success-600',
    accentBorder: 'border-l-[var(--success-500)]',
  },
  suggested_outreach: {
    iconBg: 'bg-info-50',
    iconColor: 'text-info-600',
    accentBorder: 'border-l-[var(--info-500)]',
  },
  inventory_alert: {
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-600',
    accentBorder: 'border-l-[var(--warning-500)]',
  },
  networking_nudge: {
    iconBg: 'bg-accent-50',
    iconColor: 'text-accent-600',
    accentBorder: 'border-l-[var(--accent-500)]',
  },
  recent_messages: {
    iconBg: 'bg-info-50',
    iconColor: 'text-info-600',
    accentBorder: 'border-l-[var(--info-500)]',
  },
  sunstone_product: {
    iconBg: 'bg-accent-50',
    iconColor: 'text-accent-600',
    accentBorder: 'border-l-[var(--accent-400)]',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Main DashboardCard Component
// ─────────────────────────────────────────────────────────────────────────────

export function DashboardCardComponent({ card }: { card: DashboardCardType }) {
  const router = useRouter();
  const style = CARD_STYLES[card.type] || CARD_STYLES.sunstone_product;

  return (
    <div
      className={`rounded-xl border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-sm border-l-4 ${style.accentBorder} p-4 lg:p-5 flex flex-col`}
    >
      <div className="flex items-start gap-3 flex-1">
        {/* Icon */}
        <div
          className={`shrink-0 w-10 h-10 rounded-lg ${style.iconBg} flex items-center justify-center`}
        >
          <CardTypeIcon type={card.type} className={`w-5 h-5 ${style.iconColor}`} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-text-primary leading-tight">
            {card.title}
          </p>

          {card.metric && (
            <p className="text-xl font-bold text-text-primary mt-1 tracking-tight"
               style={{ fontFamily: 'var(--font-display)' }}>
              {card.metric}
            </p>
          )}

          <p className="text-sm text-text-secondary mt-1 leading-relaxed">
            {card.body}
          </p>

          {card.sub && (
            <p className="text-xs text-text-tertiary mt-1">{card.sub}</p>
          )}
        </div>
      </div>

      {/* Action */}
      {card.actionLabel && card.actionRoute && (
        <button
          onClick={() => router.push(card.actionRoute!)}
          className="mt-3 self-start text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors"
        >
          {card.actionLabel} &rarr;
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Card Type Icons
// ─────────────────────────────────────────────────────────────────────────────

function CardTypeIcon({
  type,
  className,
}: {
  type: DashboardCardType['type'];
  className?: string;
}) {
  switch (type) {
    case 'next_event':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      );
    case 'revenue_snapshot':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2 20l5.5-5.5m0 0l3 3L16 12m0 0l4-4m-4 4v4m0-4h4" />
        </svg>
      );
    case 'inventory_alert':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case 'suggested_outreach':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
      );
    case 'networking_nudge':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      );
    case 'recent_messages':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      );
    case 'sunstone_product':
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
        </svg>
      );
  }
}
