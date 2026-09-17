-- RouteFlow production schema.
-- Run this once in Supabase Dashboard -> SQL Editor.
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null check (role in ('CUSTOMER','RIDER','BUSINESS','DISPATCHER','ADMIN')),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.users(id) on delete cascade,
  name text not null,
  description text,
  logo_url text,
  phone text,
  email text,
  address text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.riders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  vehicle_type text,
  vehicle_registration text,
  status text not null default 'AVAILABLE' check (status in ('AVAILABLE','ON_DELIVERY','OFFLINE','SUSPENDED')),
  latitude double precision,
  longitude double precision,
  max_active_deliveries integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  tracking_code text not null unique,
  customer_id uuid not null references public.users(id),
  business_id uuid references public.businesses(id),
  rider_id uuid references public.riders(id),
  pickup_address text not null,
  pickup_latitude double precision,
  pickup_longitude double precision,
  destination_address text not null,
  destination_latitude double precision,
  destination_longitude double precision,
  distance double precision,
  estimated_duration integer,
  package_description text not null,
  package_type text,
  status text not null default 'PENDING' check (status in ('PENDING','ASSIGNING','ASSIGNED','PICKED_UP','IN_TRANSIT','NEAR_DESTINATION','DELIVERED','CANCELLED','FAILED')),
  simulation_started_at timestamptz,
  simulation_duration_seconds integer,
  simulation_progress integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.delivery_status_history (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  previous_status text,
  new_status text not null,
  changed_by uuid references public.users(id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  description text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Wallets are kept separately from the legacy routeflow_state JSON document.
-- IDs are text because the current Express application uses its own IDs rather
-- than Supabase Auth UUIDs. This can be migrated to auth.users later.
create table if not exists public.wallet_accounts (
  owner_id text primary key,
  balance numeric(14,2) not null default 0 check (balance >= 0),
  currency text not null default 'NGN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_transactions (
  id text primary key,
  owner_id text not null references public.wallet_accounts(owner_id) on delete cascade,
  amount numeric(14,2) not null,
  balance_after numeric(14,2),
  type text not null,
  description text,
  delivery_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payout_accounts (
  owner_id text primary key references public.wallet_accounts(owner_id) on delete cascade,
  bank_name text,
  account_name text,
  account_number text,
  updated_at timestamptz not null default now()
);

create index if not exists wallet_transactions_owner_idx on public.wallet_transactions(owner_id, created_at desc);

create index if not exists deliveries_customer_status_idx on public.deliveries(customer_id, status);
create index if not exists deliveries_rider_status_idx on public.deliveries(rider_id, status);
create index if not exists activity_entity_idx on public.activity_logs(entity_type, entity_id);

alter table public.users enable row level security;
alter table public.businesses enable row level security;
alter table public.riders enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_status_history enable row level security;
alter table public.activity_logs enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.payout_accounts enable row level security;
