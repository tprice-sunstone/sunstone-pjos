'use client';

import type {
  DashboardCard,
  NextEventData,
  RevenueData,
  InventoryAlertData,
  OutreachData,
  NudgeData,
  MessagesData,
  SunstoneProductData,
} from '@/types';
import { NextEventCard } from './NextEventCard';
import { RevenueCard } from './RevenueCard';
import { InventoryCard } from './InventoryCard';
import { OutreachCard } from './OutreachCard';
import { NudgeCard } from './NudgeCard';
import { MessagesCard } from './MessagesCard';
import { SunstoneProductCard } from './SunstoneProductCard';

export function DashboardCardRenderer({ card }: { card: DashboardCard }) {
  switch (card.type) {
    case 'next_event':
      return <NextEventCard data={card.data as unknown as NextEventData} />;
    case 'revenue_snapshot':
      return <RevenueCard data={card.data as unknown as RevenueData} />;
    case 'inventory_alert':
      return <InventoryCard data={card.data as unknown as InventoryAlertData} />;
    case 'suggested_outreach':
      return <OutreachCard data={card.data as unknown as OutreachData} />;
    case 'networking_nudge':
      return <NudgeCard data={card.data as unknown as NudgeData} />;
    case 'recent_messages':
      return <MessagesCard data={card.data as unknown as MessagesData} />;
    case 'sunstone_product':
      return <SunstoneProductCard data={card.data as unknown as SunstoneProductData} />;
    default:
      return null;
  }
}
