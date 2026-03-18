// src/lib/demo/seed-helpers.ts
// Shared helpers for demo seed data generation

import { randomUUID } from 'crypto';

// ── Name lists ───────────────────────────────────────────────────────────────

export const FEMALE_NAMES = [
  'Aaliyah','Abigail','Ada','Addison','Adeline','Adriana','Aiden','Aimee','Ainsley',
  'Alana','Alexa','Alexandra','Alexis','Alice','Alina','Allison','Alyssa','Amanda',
  'Amber','Amelia','Amy','Andrea','Angela','Angelina','Anna','Annabelle','Annie',
  'Aria','Ariana','Ariel','Ashley','Aubrey','Audrey','Aurora','Autumn','Ava',
  'Bailey','Barbara','Beatrice','Bella','Beth','Bethany','Bianca','Blair','Blake',
  'Bonnie','Brenda','Brianna','Bridget','Brittany','Brooke','Brooklyn','Brynn',
  'Callie','Cameron','Camila','Candice','Cara','Carly','Carmen','Caroline','Cassidy',
  'Catherine','Cecilia','Charlotte','Chelsea','Chloe','Christina','Claire','Clara',
  'Claudia','Colleen','Coral','Courtney','Crystal','Cynthia','Daisy','Dakota',
  'Dana','Danielle','Daphne','Darcy','Dawn','Deanna','Deborah','Delilah','Demi',
  'Diana','Dolores','Donna','Dorothy','Eden','Eileen','Elaine','Eleanor','Elena',
  'Elisa','Elizabeth','Ella','Ellen','Ellie','Eloise','Emily','Emma','Erica',
  'Erin','Eva','Evelyn','Faith','Faye','Felicity','Fiona','Frances','Francesca',
  'Gabriella','Gail','Gemma','Georgia','Gianna','Gina','Grace','Gwendolyn',
  'Hadley','Hailey','Hannah','Harmony','Harper','Hazel','Heather','Helen','Holly',
  'Hope','Ida','Imogen','Irene','Iris','Isabel','Isabella','Isla','Ivy','Jackie',
  'Jade','Jamie','Jane','Janet','Jasmine','Jean','Jenna','Jennifer','Jessica',
  'Jillian','Joanna','Jocelyn','Jordan','Josephine','Joy','Joyce','Julia','Juliana',
  'Julie','Juliet','June','Kaitlyn','Karen','Kate','Katherine','Kaylee','Kayla',
  'Kelly','Kelsey','Kendra','Kennedy','Kimberly','Kinsley','Kylie','Lacey','Laila',
  'Laura','Lauren','Layla','Leah','Lena','Leslie','Lila','Lillian','Lily','Linda',
  'Lisa','Liv','Logan','Lola','London','Lorraine','Louise','Lucia','Lucy','Luna',
  'Lydia','Lyla','Mackenzie','Madeline','Madison','Maeve','Maggie','Maisie','Malia',
  'Mallory','Mara','Margaret','Maria','Mariah','Marina','Marlene','Martha','Mary',
  'Maya','Megan','Melanie','Melissa','Melody','Meredith','Mia','Michelle','Mikayla',
  'Mila','Mildred','Miranda','Molly','Monica','Morgan','Mya','Nadia','Naomi',
  'Natalie','Natasha','Nicole','Nina','Noel','Nora','Olivia','Paige','Paisley',
  'Pamela','Patricia','Paula','Penelope','Peyton','Phoebe','Piper','Priscilla',
  'Quinn','Rachel','Reagan','Rebecca','Reese','Regina','Renee','Riley','Rita',
  'Robin','Rosa','Rose','Rosemary','Ruby','Ruth','Rylee','Sabrina','Sadie',
  'Samantha','Sandra','Sara','Sarah','Savannah','Scarlett','Selena','Serena',
  'Shannon','Sharon','Shelby','Sierra','Sienna','Skylar','Sofia','Sonia','Sophia',
  'Stacy','Stella','Stephanie','Summer','Susan','Sydney','Tabitha','Tamara',
  'Tara','Tasha','Taylor','Teresa','Tessa','Theresa','Tiffany','Tina','Trinity',
  'Trisha','Valentina','Valerie','Vanessa','Vera','Veronica','Victoria','Violet',
  'Virginia','Vivian','Wendy','Whitney','Willa','Willow','Ximena','Yasmine',
  'Yolanda','Zara','Zoe',
];

export const LAST_NAMES = [
  'Adams','Allen','Anderson','Bailey','Baker','Barnes','Bell','Bennett','Brooks',
  'Brown','Bryant','Burns','Butler','Campbell','Carter','Chapman','Clark','Cole',
  'Collins','Cook','Cooper','Cox','Cruz','Daniels','Davis','Diaz','Dixon','Edwards',
  'Ellis','Evans','Fisher','Flores','Foster','Fox','Garcia','Gibson','Gomez',
  'Gonzalez','Graham','Grant','Gray','Green','Griffin','Hall','Hamilton','Harris',
  'Harrison','Hart','Hayes','Henderson','Henry','Hernandez','Hill','Holmes',
  'Howard','Hudson','Hughes','Hunt','Jackson','James','Jenkins','Jensen','Johnson',
  'Jones','Jordan','Kelly','Kennedy','Kim','King','Knight','Lawrence','Lee','Lewis',
  'Long','Lopez','Martin','Martinez','Mason','McCarthy','McDonald','McKenzie',
  'Miller','Mitchell','Moore','Morgan','Morris','Murphy','Murray','Myers','Nelson',
  'Newman','Nguyen','Nichols','Oliver','Ortiz','Parker','Patel','Patterson','Perez',
  'Perry','Peterson','Phillips','Pierce','Porter','Powell','Price','Quinn','Ramirez',
  'Reed','Reyes','Reynolds','Richardson','Rivera','Roberts','Robinson','Rodriguez',
  'Rogers','Rose','Ross','Russell','Ryan','Sanchez','Sanders','Scott','Shaw',
  'Simmons','Simpson','Smith','Spencer','Stevens','Stewart','Stone','Sullivan',
  'Taylor','Thomas','Thompson','Torres','Tucker','Turner','Walker','Wallace','Walsh',
  'Ward','Warren','Washington','Watson','Webb','Wells','West','White','Williams',
  'Wilson','Wood','Wright','Young',
];

// ── Chain & product data ─────────────────────────────────────────────────────

export const CHAIN_NAMES_GOLD = [
  'Figaro 14K Gold Fill','Cable 14K Gold Fill','Rope 14K Gold Fill',
  'Box 14K Gold Fill','Curb 14K Gold Fill','Paperclip 14K Gold Fill',
  'Singapore 14K Gold Fill','Satellite 14K Gold Fill','Rolo 14K Gold Fill',
  'Herringbone 14K Gold Fill','Ball 14K Gold Fill','Wheat 14K Gold Fill',
];

export const CHAIN_NAMES_SILVER = [
  'Figaro Sterling Silver','Cable Sterling Silver','Rope Sterling Silver',
  'Box Sterling Silver','Curb Sterling Silver','Paperclip Sterling Silver',
  'Singapore Sterling Silver','Satellite Sterling Silver','Rolo Sterling Silver',
  'Ball Sterling Silver','Wheat Sterling Silver',
  'Herringbone Sterling Silver','Mariner Sterling Silver',
];

export const CHAIN_NAMES_ROSE = [
  'Figaro 14K Rose Gold Fill','Cable 14K Rose Gold Fill','Rope 14K Rose Gold Fill',
  'Box 14K Rose Gold Fill','Curb 14K Rose Gold Fill','Paperclip 14K Rose Gold Fill',
  'Singapore 14K Rose Gold Fill','Satellite 14K Rose Gold Fill',
  'Rolo 14K Rose Gold Fill','Herringbone 14K Rose Gold Fill','Ball 14K Rose Gold Fill',
];

export const CHARM_NAMES = [
  'Heart Charm','Star Charm','Moon Charm','Butterfly Charm','Initial Disc',
  'Evil Eye Charm','Birthstone Drop','Cross Charm','Infinity Charm',
  'Lightning Bolt','Pearl Drop','CZ Solitaire','Leaf Charm','Feather Charm',
  'Hamsa Charm','Horseshoe Charm','Diamond Shape','Teardrop Charm',
  'Sun Charm','Flower Charm',
];

export const MATERIALS = ['14K Gold Fill', 'Sterling Silver', '14K Rose Gold Fill'];

export const VENUE_NAMES = [
  'The Marketplace','Downtown Pop-Up','Spring Festival','Bridal Expo',
  'Summer Night Market','Farmers Market','Holiday Bazaar','Art Walk',
  'Trunk Show at Bloom','Wine & Weld Night','Boutique Pop-Up',
  'Yoga Studio Event','Ladies Night Out','Country Club Social',
  'Sorority Event','Chamber Mixer','Charity Gala','Beach Market',
  'Craft Fair','Fall Festival','Winterfest','Saturday Market',
  'Spa Day Event','Salon Pop-Up','Corporate Wellness','Birthday Party',
  'Bachelorette Party','Wedding Party','Church Fundraiser','School Event',
];

export const CITIES = [
  'Austin, TX','Nashville, TN','Scottsdale, AZ','Charleston, SC',
  'Savannah, GA','San Diego, CA','Denver, CO','Portland, OR',
  'Dallas, TX','Atlanta, GA','Charlotte, NC','Tampa, FL',
];

export const PRODUCT_TYPE_NAMES = ['Bracelet','Anklet','Ring','Necklace','Hand Chain'];

// ── Utility functions ────────────────────────────────────────────────────────

let _seeded = false;
let _usedNames = new Set<string>();

export function resetNameTracker() {
  _usedNames = new Set();
}

export function uuid(): string {
  return randomUUID();
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function pickN<T>(arr: readonly T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

export function weightedPick<T>(items: readonly T[], weights: readonly number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

export function randomAmount(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

export function randomInt(min: number, max: number): number {
  return Math.floor(min + Math.random() * (max - min + 1));
}

export function randomPhone(): string {
  const area = randomInt(200, 999);
  const mid = randomInt(200, 999);
  const last = randomInt(1000, 9999);
  return `+1${area}${mid}${last}`;
}

export function randomEmail(first: string, last: string): string {
  const domains = ['gmail.com','yahoo.com','outlook.com','icloud.com','hotmail.com'];
  const suffix = randomInt(1, 999);
  return `${first.toLowerCase()}${last.toLowerCase()}${suffix}@${pick(domains)}`;
}

/** Generate a unique first+last name pair */
export function uniqueName(): { first: string; last: string } {
  let attempts = 0;
  while (attempts < 500) {
    const first = pick(FEMALE_NAMES);
    const last = pick(LAST_NAMES);
    const key = `${first} ${last}`;
    if (!_usedNames.has(key)) {
      _usedNames.add(key);
      return { first, last };
    }
    attempts++;
  }
  // Fallback: just use random combo
  const first = pick(FEMALE_NAMES);
  const last = pick(LAST_NAMES);
  return { first, last };
}

/** Returns ISO timestamp for n days ago from "now" (today at noon UTC) */
export function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

/** Returns ISO timestamp for n days from now */
export function daysFromNow(n: number): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString();
}

/** Returns ISO timestamp for a random time on a day n days ago */
export function randomTimeOnDay(daysAgoN: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgoN);
  d.setUTCHours(randomInt(9, 20), randomInt(0, 59), randomInt(0, 59), 0);
  return d.toISOString();
}

/** Generates an event start time (10am-6pm) on a given day offset */
export function eventTime(daysAgoN: number, hour: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgoN);
  d.setUTCHours(hour, 0, 0, 0);
  return d.toISOString();
}

/** Birthday generator — random date in the past 20-55 years */
export function randomBirthday(): string {
  const year = new Date().getFullYear() - randomInt(20, 55);
  const month = randomInt(1, 12);
  const day = randomInt(1, 28);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// ── Seed data types ──────────────────────────────────────────────────────────

export interface SeedData {
  taxProfiles: any[];
  productTypes: any[];
  pricingTiers: any[];
  inventoryItems: any[];
  chainProductPrices: any[];
  clients: any[];
  clientPhoneNumbers: any[];
  clientTagAssignments: any[];
  events: any[];
  sales: any[];
  saleItems: any[];
  giftCards: any[];
  giftCardRedemptions: any[];
  warranties: any[];
  warrantyClaims: any[];
  partyRequests: any[];
}

export interface TenantOverrides {
  pricing_mode: string;
  subscription_tier: string;
  subscription_status: string;
  trial_ends_at: string | null;
  default_tax_rate: number;
  warranty_enabled: boolean;
  warranty_per_item_default: number;
  warranty_per_invoice_default: number;
  warranty_duration_days: number;
  platform_fee_percent: number;
  fee_handling: string;
}
