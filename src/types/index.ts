// ============================================================================
// Sunstone PJOS — Application Types (Updated for Financial Accuracy Tasks)
// ============================================================================
// These mirror the database schema. Run `npm run db:types` for auto-generated
// Supabase types, but these provide the application-layer contracts.
//
// Changes in this version:
// - SaleItem: added product_type_id, product_type_name, inches_used,
//   jump_ring_cost, chain_material_cost
// - CartItem: added product_type_id, product_type_name, inches_used,
//   pricing_mode, and _jump_ring/_inventory metadata fields
// - Added JumpRingResolution interface
// - Added JumpRingConfirmation interface
// - Added ProductType interface
// - Added ChainProductPrice interface
// ============================================================================

export type SubscriptionTier = 'free' | 'pro' | 'business';
export type FeeHandling = 'pass_to_customer' | 'absorb';
export type TenantRole = 'admin' | 'manager' | 'staff';
export type BusinessType = 'permanent_jewelry' | 'salon_spa' | 'boutique' | 'popup_vendor' | 'other';
export type InventoryType = 'chain' | 'jump_ring' | 'charm' | 'connector' | 'other';
export type InventoryUnit = 'in' | 'ft' | 'each' | 'pack';
export type PricingMode = 'per_product' | 'per_inch';
export type MovementType = 'restock' | 'sale' | 'waste' | 'adjustment';
export type PaymentMethod = 'card_present' | 'card_not_present' | 'cash' | 'venmo' | 'other';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type QueueStatus = 'waiting' | 'notified' | 'served' | 'no_show';
export type SaleStatus = 'draft' | 'completed' | 'voided';

// Re-export Permission from the canonical source
export type { Permission, TenantRole as PermissionRole } from '@/lib/permissions';

// ============================================================================
// Tenant
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  subscription_tier: SubscriptionTier;
  fee_handling: FeeHandling;
  business_type: BusinessType | null;
  phone: string | null;
  website: string | null;
  square_merchant_id: string | null;
  square_access_token: string | null;
  square_refresh_token: string | null;
  square_location_id: string | null;
  stripe_account_id: string | null;
  stripe_onboarding_complete: boolean;
  onboarding_completed: boolean;
  logo_url: string | null;
  brand_color: string;
  waiver_text: string;
  waiver_required: boolean;
  min_monthly_transactions: number;
  created_at: string;
  updated_at: string;
}

export interface TenantMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TenantRole;
  display_name: string | null;
  invited_email: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Inventory
// ============================================================================

export interface InventoryItem {
  id: string;
  tenant_id: string;
  name: string;
  type: InventoryType;
  material: string | null;
  supplier: string | null;
  sku: string | null;
  unit: InventoryUnit;
  cost_per_unit: number;
  sell_price: number;
  quantity_on_hand: number;
  reorder_threshold: number;
  is_active: boolean;
  notes: string | null;
  pricing_mode?: 'per_product' | 'per_inch' | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  tenant_id: string;
  inventory_item_id: string;
  movement_type: MovementType;
  quantity: number;
  reference_id: string | null;
  notes: string | null;
  performed_by: string | null;
  created_at: string;
}

// ============================================================================
// Product Types & Chain Pricing
// ============================================================================

export interface ProductType {
  id: string;
  tenant_id: string;
  name: string;
  slug: string;
  default_inches: number | null;
  jump_rings_required: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface Material {
  id: string;
  tenant_id: string;
  name: string;
  abbreviation: string | null;
  sort_order: number;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}
export interface ChainProductPrice {
  id: string;
  tenant_id: string;
  inventory_item_id: string;
  product_type_id: string;
  sell_price: number;
  default_inches: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Events & Tax
// ============================================================================

export interface TaxProfile {
  id: string;
  tenant_id: string;
  name: string;
  rate: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string | null;
  booth_fee: number;
  tax_profile_id: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  tax_profile?: TaxProfile | null;
}

// ============================================================================
// Sales
// ============================================================================

export interface Sale {
  id: string;
  tenant_id: string;
  event_id: string | null;
  client_id: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  tip_amount: number;
  platform_fee_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_provider: string | null;
  payment_provider_id: string | null;
  platform_fee_rate: number | null;
  fee_handling: FeeHandling | null;
  status: SaleStatus;
  receipt_email: string | null;
  receipt_phone: string | null;
  receipt_sent_at: string | null;
  notes: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  items?: SaleItem[];
  client?: Client | null;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  tenant_id: string;
  inventory_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  discount_type: 'flat' | 'percentage' | null;
  discount_value: number;
  line_total: number;
  product_type_id: string | null;
  product_type_name: string | null;
  inches_used: number | null;
  jump_ring_cost: number;           // COGS — jump ring material cost
  chain_material_cost: number;       // COGS — chain material cost
  created_at: string;
}

// ============================================================================
// Clients & Waivers
// ============================================================================

export interface Client {
  id: string;
  tenant_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Waiver {
  id: string;
  tenant_id: string;
  client_id: string | null;
  event_id: string | null;
  signer_name: string;
  signer_email: string | null;
  waiver_text: string;
  signature_data: string;
  signed_at: string;
  pdf_path: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================================
// Queue
// ============================================================================

export interface QueueEntry {
  id: string;
  tenant_id: string;
  event_id: string;
  client_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  position: number;
  status: QueueStatus;
  notified_at: string | null;
  served_at: string | null;
  waiver_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Platform Fee Rates
// ============================================================================

export const PLATFORM_FEE_RATES: Record<SubscriptionTier, number> = {
  free: 0.025,   // 2.5%
  pro: 0.015,    // 1.5%
  business: 0,   // 0%
};

export const SUBSCRIPTION_PRICES: Record<SubscriptionTier, number> = {
  free: 0,
  pro: 99,
  business: 299,
};

// ============================================================================
// POS Cart Types (in-memory, not persisted until sale completes)
// ============================================================================

export interface CartItem {
  id: string; // temp id
  inventory_item_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  discount_type: 'flat' | 'percentage' | null;
  discount_value: number;
  line_total: number;
  // Chain product fields
  product_type_id?: string | null;
  product_type_name?: string | null;
  inches_used?: number | null;
  pricing_mode?: 'per_product' | 'per_inch' | null;
  // Jump ring metadata (not persisted — used for calculation only)
  _jump_rings_required?: number | null;
  _inventory_type?: string | null;
  _material?: string | null;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  discount_amount: number;
  tax_rate: number;
  tax_amount: number;
  tip_amount: number;
  platform_fee_amount: number;
  total: number;
  payment_method: PaymentMethod | null;
  client_id: string | null;
  notes: string;
}

// ============================================================================
// Jump Ring Resolution (used during sale completion)
// ============================================================================

export interface JumpRingResolution {
  cart_item_id: string;
  cart_item_name: string;
  jump_rings_needed: number;
  jump_ring_inventory_id: string | null;
  jump_ring_cost_each: number;
  material_name: string;
  resolved: boolean;
}

// ============================================================================
// Jump Ring Confirmation (used in post-sale confirmation UI)
// ============================================================================

export interface JumpRingConfirmation {
  cart_item_id: string;
  item_name: string;                  // "14k Gold Fill Bracelet"
  material_name: string;              // "14k Gold Fill"
  default_count: number;              // what was auto-deducted in Phase 1
  actual_count: number;               // artist's adjusted count (starts at default)
  jump_ring_inventory_id: string | null;  // which jump ring was used
  jump_ring_name: string;             // "14k Gold Fill Jump Ring"
}