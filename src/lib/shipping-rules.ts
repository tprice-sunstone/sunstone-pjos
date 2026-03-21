// ============================================================================
// Shipping Rules — src/lib/shipping-rules.ts
// ============================================================================
// Pure utility for dynamic shipping options in the reorder flow.
// Zone-based pricing for all methods (West/Mid/East from South Jordan, UT).
// No Supabase imports — works client + server.
// ============================================================================

// ── Types ─────────────────────────────────────────────────────────────────

export type CartCategory = 'standard' | 'hazmat' | 'heavy' | 'hazmat_heavy';

export type ShippingZone = 'west' | 'mid' | 'east';

export interface ShippingOption {
  value: string;
  label: string;
  subtitle?: string;
  note?: string;
  estimatedCost: number;
  surcharges?: Array<{ name: string; amount: number }>;
  disabled?: boolean;
  disabledReason?: string;
  transitDays?: string;
}

/** Zone-based rate: { west, mid, east } for each weight class */
interface ZoneWeightRates {
  light: { west: number; mid: number; east: number };
  heavy: { west: number; mid: number; east: number };
}

export interface ShippingRatesConfig {
  usps_priority: number;
  ups_ground: ZoneWeightRates;
  ups_2day: ZoneWeightRates;
  ups_next_day: ZoneWeightRates;
  will_call: number;
  argon_surcharge: number;
}

// ── Default rates (fallback — matches migration 063 seed) ────────────────

export const DEFAULT_RATES: ShippingRatesConfig = {
  usps_priority: 12.95,
  ups_ground: {
    light: { west: 17.00, mid: 25.00, east: 33.00 },
    heavy: { west: 26.00, mid: 43.00, east: 68.00 },
  },
  ups_2day: {
    light: { west: 28.00, mid: 38.00, east: 49.00 },
    heavy: { west: 42.00, mid: 65.00, east: 98.00 },
  },
  ups_next_day: {
    light: { west: 45.00, mid: 58.00, east: 72.00 },
    heavy: { west: 68.00, mid: 95.00, east: 142.00 },
  },
  will_call: 0,
  argon_surcharge: 10.00,
};

// ── Zone map (all 50 states + DC) ────────────────────────────────────────

const ZONE_MAP: Record<string, ShippingZone> = {
  // WEST (ships from South Jordan, UT)
  WA: 'west', OR: 'west', CA: 'west', NV: 'west',
  AZ: 'west', UT: 'west', ID: 'west', MT: 'west',
  WY: 'west', CO: 'west', NM: 'west', AK: 'west', HI: 'west',
  // MID
  TX: 'mid', OK: 'mid', KS: 'mid', NE: 'mid',
  SD: 'mid', ND: 'mid', MN: 'mid', IA: 'mid',
  MO: 'mid', AR: 'mid', LA: 'mid', WI: 'mid',
  IL: 'mid', MI: 'mid', IN: 'mid', OH: 'mid',
  MS: 'mid', AL: 'mid', TN: 'mid', KY: 'mid',
  // EAST
  NY: 'east', NJ: 'east', PA: 'east', FL: 'east',
  GA: 'east', NC: 'east', SC: 'east', VA: 'east',
  MD: 'east', DE: 'east', CT: 'east', MA: 'east',
  RI: 'east', VT: 'east', NH: 'east', ME: 'east',
  WV: 'east', DC: 'east',
};

// ── Transit time estimates by zone ───────────────────────────────────────

const TRANSIT_TIMES: Record<string, Record<ShippingZone, string>> = {
  usps_priority:  { west: '2-3 business days', mid: '3-4 business days', east: '4-5 business days' },
  ups_ground:     { west: '2-3 business days', mid: '3-5 business days', east: '5-7 business days' },
  ups_2day:       { west: '2 business days',   mid: '2 business days',   east: '2 business days' },
  ups_next_day:   { west: '1 business day',    mid: '1 business day',    east: '1 business day' },
};

// ── Cart category detection ───────────────────────────────────────────────

const HEAVY_PATTERNS = [/welder/i, /kit/i, /machine/i, /power.?supply/i, /zapp/i, /mpulse/i, /pulse arc/i];

export function detectCartCategory(itemNames: string[]): CartCategory {
  const combined = itemNames.join(' ');
  const hasHazmat = /argon/i.test(combined);
  const hasHeavy = HEAVY_PATTERNS.some(p => p.test(combined));

  if (hasHazmat && hasHeavy) return 'hazmat_heavy';
  if (hasHazmat) return 'hazmat';
  if (hasHeavy) return 'heavy';
  return 'standard';
}

// ── Zone lookup ───────────────────────────────────────────────────────────

export function getShippingZone(state: string): ShippingZone {
  const s = state.toUpperCase().trim();
  return ZONE_MAP[s] || 'east'; // Default to east (highest rate) for unknown states
}

// Keep legacy export alias for compatibility
export type WelderZone = ShippingZone;
export const getWelderZone = getShippingZone;

// ── Weight class detection ────────────────────────────────────────────────

export function getWeightClass(itemNames: string[]): 'heavy' | 'light' {
  const combined = itemNames.join(' ');
  return HEAVY_PATTERNS.some(p => p.test(combined)) ? 'heavy' : 'light';
}

// ── Next-day cutoff check ─────────────────────────────────────────────────

export function isPastNextDayCutoff(): boolean {
  // 11:00 AM MST = 18:00 UTC (MST is UTC-7)
  const now = new Date();
  const utcHour = now.getUTCHours();
  return utcHour >= 18;
}

// ── Rate lookup helper ────────────────────────────────────────────────────

function lookupRate(zoneRates: ZoneWeightRates, zone: ShippingZone, weight: 'heavy' | 'light'): number {
  return zoneRates[weight][zone];
}

// ── Build shipping options ────────────────────────────────────────────────

export function getShippingOptions(
  category: CartCategory,
  state: string,
  rates?: ShippingRatesConfig | null,
  itemNames?: string[],
): ShippingOption[] {
  const r = rates ?? DEFAULT_RATES;
  const zone = getShippingZone(state);
  const hasState = !!state.trim();
  const weight = getWeightClass(itemNames || []);
  const isHazmat = category === 'hazmat' || category === 'hazmat_heavy';
  const isHeavy = category === 'heavy' || category === 'hazmat_heavy';

  const options: ShippingOption[] = [];

  // ── USPS Priority Mail — flat rate, no zone ──
  options.push({
    value: 'USPS Priority Mail',
    label: 'USPS Priority Mail',
    subtitle: 'Flat rate',
    estimatedCost: r.usps_priority,
    transitDays: hasState ? TRANSIT_TIMES.usps_priority[zone] : undefined,
    disabled: isHeavy,
    disabledReason: isHeavy ? 'Not available for heavy equipment' : undefined,
  });

  // ── UPS Ground — zone-based, weight-based ──
  {
    const baseRate = hasState ? lookupRate(r.ups_ground, zone, isHeavy ? 'heavy' : weight) : 0;
    const surcharges: Array<{ name: string; amount: number }> = [];
    if (isHazmat) surcharges.push({ name: 'Argon surcharge', amount: r.argon_surcharge });
    const total = baseRate + surcharges.reduce((s, sc) => s + sc.amount, 0);

    const opt: ShippingOption = {
      value: 'UPS Ground',
      label: 'UPS Ground',
      subtitle: hasState ? 'Based on your location' : undefined,
      estimatedCost: Math.round(total * 100) / 100,
      surcharges: surcharges.length > 0 ? surcharges : undefined,
      transitDays: hasState ? TRANSIT_TIMES.ups_ground[zone] : undefined,
    };
    if (isHazmat) opt.note = 'Argon is classified as hazardous — ground shipping only';
    else if (isHeavy) opt.note = 'Heavy equipment requires ground freight shipping';
    options.push(opt);
  }

  // ── UPS 2-Day Air — zone-based, NOT available for hazmat ──
  {
    const baseRate = hasState ? lookupRate(r.ups_2day, zone, isHeavy ? 'heavy' : weight) : 0;
    options.push({
      value: 'UPS 2nd Day Air',
      label: 'UPS 2nd Day Air',
      subtitle: hasState ? 'Based on your location' : undefined,
      estimatedCost: Math.round(baseRate * 100) / 100,
      transitDays: hasState ? TRANSIT_TIMES.ups_2day[zone] : undefined,
      disabled: isHazmat,
      disabledReason: isHazmat ? 'Not available — order contains argon (ground shipping required)' : undefined,
    });
  }

  // ── UPS Next Day Air — zone-based, NOT available for hazmat ──
  {
    const baseRate = hasState ? lookupRate(r.ups_next_day, zone, isHeavy ? 'heavy' : weight) : 0;
    const opt: ShippingOption = {
      value: 'UPS Next Day Air',
      label: 'UPS Next Day Air',
      subtitle: hasState ? 'Based on your location' : undefined,
      estimatedCost: Math.round(baseRate * 100) / 100,
      transitDays: hasState ? TRANSIT_TIMES.ups_next_day[zone] : undefined,
      disabled: isHazmat,
      disabledReason: isHazmat ? 'Not available — order contains argon (ground shipping required)' : undefined,
    };
    if (!isHazmat && isPastNextDayCutoff()) {
      opt.note = 'Past 11 AM MST cutoff — ships next business day';
    } else if (!isHazmat) {
      opt.note = 'Order by 11 AM MST for same-day ship';
    }
    options.push(opt);
  }

  // ── Will Call — always $0 ──
  options.push({
    value: 'Will Call / Pickup',
    label: 'Will Call / Pickup',
    subtitle: 'Pick up in Springville, UT',
    estimatedCost: r.will_call,
  });

  return options;
}

// ── Processing disclaimer ─────────────────────────────────────────────────

export function getProcessingDisclaimer(shippingMethod: string): string {
  switch (shippingMethod) {
    case 'UPS Next Day Air':
      return 'Orders placed before 11 AM MST ship same day. After 11 AM ships next business day.';
    case 'UPS 2nd Day Air':
      return 'Orders typically ship within 1 business day.';
    case 'Will Call / Pickup':
      return 'Pick up at Sunstone in Springville, UT. We\'ll notify you when ready.';
    default:
      return 'Orders typically ship within 1-2 business days.';
  }
}
