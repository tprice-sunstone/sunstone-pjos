'use client';

import type { DashboardCard } from '@/types';
import { DashboardCardRenderer } from './DashboardCard';
import { CardSkeleton } from './CardSkeleton';
import { WelcomeCard } from './WelcomeCard';

interface DashboardCardGridProps {
  cards: DashboardCard[];
  loading: boolean;
  tenantName: string;
}

export function DashboardCardGrid({ cards, loading, tenantName }: DashboardCardGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="grid grid-cols-1" style={{ gap: 14 }}>
        <WelcomeCard tenantName={tenantName} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 14 }}>
      {cards.map((card, idx) => (
        <DashboardCardRenderer key={`${card.type}-${idx}`} card={card} />
      ))}
    </div>
  );
}
