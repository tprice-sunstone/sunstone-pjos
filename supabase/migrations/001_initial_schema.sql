-- ============================================================================
-- Sunstone PJOS — Full Schema Migration
-- ============================================================================
-- Run this in your Supabase SQL Editor or via `supabase db push`

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- ENUMS
-- ============================================================================

create type subscription_tier as enum ('free', 'pro', 'business');
create type fee_handling as enum ('pass_to_customer', 'absorb');
create type tenant_role as enum ('admin', 'staff');
create type inventory_type as enum ('chain', 'jump_ring', 'charm', 'connector', 'other');
create type inventory_unit as enum ('ft', 'each', 'pack');
create type movement_type as enum ('restock', 'sale', 'waste', 'adjustment');
create type payment_method as enum ('card_present', 'card_not_present', 'cash', 'venmo', 'other');
create type payment_status as enum ('pending', 'completed', 'failed', 'refunded');
create type queue_status as enum ('waiting', 'notified', 'served', 'no_show');
create type sale_status as enum ('draft', 'completed', 'voided');

-- ============================================================================
-- TENANTS
-- ============================================================================

create table tenants (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text unique not null,
  owner_id uuid not null references auth.users(id),
  subscription_tier subscription_tier not null default 'free',
  fee_handling fee_handling not null default 'pass_to_customer',
  -- Payment provider connections
  square_merchant_id text,
  square_access_token text,
  square_refresh_token text,
  square_location_id text,
  stripe_account_id text,
  stripe_onboarding_complete boolean default false,
  -- Branding
  logo_url text,
  brand_color text default '#ec7518',
  -- Waiver
  waiver_text text default 'I acknowledge the risks associated with permanent jewelry application and agree to the terms of service.',
  waiver_required boolean default true,
  -- Minimum transactions (for free tier)
  min_monthly_transactions int default 20,
  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tenants_owner on tenants(owner_id);
create index idx_tenants_slug on tenants(slug);

-- ============================================================================
-- TENANT MEMBERS
-- ============================================================================

create table tenant_members (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role tenant_role not null default 'staff',
  invited_email text,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(tenant_id, user_id)
);

create index idx_tenant_members_user on tenant_members(user_id);
create index idx_tenant_members_tenant on tenant_members(tenant_id);

-- ============================================================================
-- INVENTORY ITEMS
-- ============================================================================

create table inventory_items (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  type inventory_type not null default 'other',
  material text,
  supplier text,
  sku text,
  unit inventory_unit not null default 'each',
  cost_per_unit numeric(10,4) not null default 0,
  sell_price numeric(10,2) not null default 0,
  quantity_on_hand numeric(12,4) not null default 0,
  reorder_threshold numeric(12,4) default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_inventory_tenant on inventory_items(tenant_id);
create index idx_inventory_type on inventory_items(tenant_id, type);
create index idx_inventory_low_stock on inventory_items(tenant_id)
  where quantity_on_hand <= reorder_threshold and is_active = true;

-- ============================================================================
-- INVENTORY MOVEMENTS
-- ============================================================================

create table inventory_movements (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  inventory_item_id uuid not null references inventory_items(id) on delete cascade,
  movement_type movement_type not null,
  quantity numeric(12,4) not null,
  -- quantity is positive for restock, negative for sale/waste
  reference_id uuid, -- sale_id or other reference
  notes text,
  performed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index idx_movements_item on inventory_movements(inventory_item_id);
create index idx_movements_tenant on inventory_movements(tenant_id);

-- ============================================================================
-- TAX PROFILES
-- ============================================================================

create table tax_profiles (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  rate numeric(6,4) not null, -- e.g. 0.0825 for 8.25%
  is_default boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tax_profiles_tenant on tax_profiles(tenant_id);

-- ============================================================================
-- EVENTS
-- ============================================================================

create table events (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  location text,
  start_time timestamptz not null,
  end_time timestamptz,
  booth_fee numeric(10,2) default 0,
  tax_profile_id uuid references tax_profiles(id),
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_events_tenant on events(tenant_id);
create index idx_events_date on events(tenant_id, start_time);

-- ============================================================================
-- CLIENTS
-- ============================================================================

create table clients (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  first_name text,
  last_name text,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_tenant on clients(tenant_id);
create index idx_clients_email on clients(tenant_id, email);
create index idx_clients_phone on clients(tenant_id, phone);

-- ============================================================================
-- WAIVERS
-- ============================================================================

create table waivers (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_id uuid references clients(id),
  event_id uuid references events(id),
  signer_name text not null,
  signer_email text,
  waiver_text text not null,
  signature_data text not null, -- base64 signature image
  signed_at timestamptz not null default now(),
  pdf_path text, -- Supabase storage path
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index idx_waivers_tenant on waivers(tenant_id);
create index idx_waivers_client on waivers(client_id);
create index idx_waivers_event on waivers(event_id);

-- ============================================================================
-- SALES
-- ============================================================================

create table sales (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  event_id uuid references events(id),
  client_id uuid references clients(id),
  -- Amounts
  subtotal numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  tip_amount numeric(10,2) not null default 0,
  platform_fee_amount numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  -- Payment
  payment_method payment_method not null,
  payment_status payment_status not null default 'pending',
  payment_provider text, -- 'square' | 'stripe'
  payment_provider_id text, -- external transaction id
  -- Platform fee tracking
  platform_fee_rate numeric(6,4), -- actual rate applied
  fee_handling fee_handling, -- how it was handled for this sale
  -- Status
  status sale_status not null default 'completed',
  -- Receipt
  receipt_email text,
  receipt_phone text,
  receipt_sent_at timestamptz,
  -- Meta
  notes text,
  completed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_sales_tenant on sales(tenant_id);
create index idx_sales_event on sales(event_id);
create index idx_sales_client on sales(client_id);
create index idx_sales_date on sales(tenant_id, created_at);

-- ============================================================================
-- SALE ITEMS
-- ============================================================================

create table sale_items (
  id uuid primary key default uuid_generate_v4(),
  sale_id uuid not null references sales(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  inventory_item_id uuid references inventory_items(id),
  -- Item details (snapshot at time of sale)
  name text not null,
  quantity numeric(10,4) not null default 1,
  unit_price numeric(10,2) not null,
  discount_type text, -- 'flat' | 'percentage'
  discount_value numeric(10,2) default 0,
  line_total numeric(10,2) not null,
  created_at timestamptz not null default now()
);

create index idx_sale_items_sale on sale_items(sale_id);
create index idx_sale_items_inventory on sale_items(inventory_item_id);

-- ============================================================================
-- QUEUE ENTRIES
-- ============================================================================

create table queue_entries (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  event_id uuid not null references events(id) on delete cascade,
  client_id uuid references clients(id),
  -- Queue info
  name text not null,
  phone text,
  email text,
  position int not null,
  status queue_status not null default 'waiting',
  -- Timestamps
  notified_at timestamptz,
  served_at timestamptz,
  waiver_id uuid references waivers(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_queue_tenant on queue_entries(tenant_id);
create index idx_queue_event on queue_entries(event_id);
create index idx_queue_status on queue_entries(event_id, status);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Get current user's tenant IDs
create or replace function get_user_tenant_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select tenant_id from tenant_members where user_id = auth.uid()
  union
  select id from tenants where owner_id = auth.uid();
$$;

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_updated_at before update on tenants for each row execute function update_updated_at();
create trigger set_updated_at before update on tenant_members for each row execute function update_updated_at();
create trigger set_updated_at before update on inventory_items for each row execute function update_updated_at();
create trigger set_updated_at before update on tax_profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on events for each row execute function update_updated_at();
create trigger set_updated_at before update on clients for each row execute function update_updated_at();
create trigger set_updated_at before update on sales for each row execute function update_updated_at();
create trigger set_updated_at before update on queue_entries for each row execute function update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

alter table tenants enable row level security;
alter table tenant_members enable row level security;
alter table inventory_items enable row level security;
alter table inventory_movements enable row level security;
alter table tax_profiles enable row level security;
alter table events enable row level security;
alter table clients enable row level security;
alter table waivers enable row level security;
alter table sales enable row level security;
alter table sale_items enable row level security;
alter table queue_entries enable row level security;

-- TENANTS policies
create policy "Users can view their tenants"
  on tenants for select
  using (id in (select get_user_tenant_ids()));

create policy "Owners can update their tenants"
  on tenants for update
  using (owner_id = auth.uid());

create policy "Authenticated users can create tenants"
  on tenants for insert
  with check (auth.uid() = owner_id);

-- TENANT MEMBERS policies
create policy "Members can view their tenant members"
  on tenant_members for select
  using (tenant_id in (select get_user_tenant_ids()));

create policy "Admins can manage tenant members"
  on tenant_members for all
  using (
    tenant_id in (
      select tenant_id from tenant_members where user_id = auth.uid() and role = 'admin'
      union
      select id from tenants where owner_id = auth.uid()
    )
  );

-- Generic tenant-scoped policies (applied to all domain tables)
-- Inventory Items
create policy "Tenant access" on inventory_items for select
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant insert" on inventory_items for insert
  with check (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant update" on inventory_items for update
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant delete" on inventory_items for delete
  using (tenant_id in (select get_user_tenant_ids()));

-- Inventory Movements
create policy "Tenant access" on inventory_movements for select
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant insert" on inventory_movements for insert
  with check (tenant_id in (select get_user_tenant_ids()));

-- Tax Profiles
create policy "Tenant access" on tax_profiles for select
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant insert" on tax_profiles for insert
  with check (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant update" on tax_profiles for update
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant delete" on tax_profiles for delete
  using (tenant_id in (select get_user_tenant_ids()));

-- Events
create policy "Tenant access" on events for select
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant insert" on events for insert
  with check (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant update" on events for update
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant delete" on events for delete
  using (tenant_id in (select get_user_tenant_ids()));

-- Clients
create policy "Tenant access" on clients for select
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant insert" on clients for insert
  with check (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant update" on clients for update
  using (tenant_id in (select get_user_tenant_ids()));

-- Waivers (public insert for signing page, tenant read)
create policy "Tenant access" on waivers for select
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Public insert" on waivers for insert
  with check (true); -- public waiver signing
  
-- Sales
create policy "Tenant access" on sales for select
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant insert" on sales for insert
  with check (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant update" on sales for update
  using (tenant_id in (select get_user_tenant_ids()));

-- Sale Items
create policy "Tenant access" on sale_items for select
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Tenant insert" on sale_items for insert
  with check (tenant_id in (select get_user_tenant_ids()));

-- Queue Entries (public insert via waiver flow)
create policy "Tenant access" on queue_entries for select
  using (tenant_id in (select get_user_tenant_ids()));
create policy "Public insert" on queue_entries for insert
  with check (true); -- public queue join
create policy "Tenant update" on queue_entries for update
  using (tenant_id in (select get_user_tenant_ids()));

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('waivers', 'waivers', false)
on conflict do nothing;

create policy "Tenant members can read waivers"
  on storage.objects for select
  using (bucket_id = 'waivers');

create policy "Anyone can upload waivers"
  on storage.objects for insert
  with check (bucket_id = 'waivers');
