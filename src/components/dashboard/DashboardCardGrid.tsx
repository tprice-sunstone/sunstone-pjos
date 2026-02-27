'use client';

import type { DashboardCard } from '@/types';
import { DashboardCardComponent } from './DashboardCard';
import { CardSkeleton } from './CardSkeleton';
import { WelcomeCard } from './WelcomeCard';

interface DashboardCardGridProps {
  cards: DashboardCard[];
  loading: boolean;
  tenantName: string;
}

export function DashboardCardGrid({ cards, loading, tenantName }: DashboardCardGridProps) {
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Empty state — new tenant
  if (cards.length === 0) {
    return (
      <div className="grid grid-cols-1 gap-4">
        <WelcomeCard tenantName={tenantName} />
      </div>
    );
  }

  // Card grid
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
      {cards.map((card, idx) => (
        <DashboardCardComponent key={`${card.type}-${idx}`} card={card} />
      ))}
    </div>
  );
}
