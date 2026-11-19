-- Smart Rent Car Catania - Supabase / PostgreSQL Initial Schema
-- Requires PostgreSQL 15+ with btree_gist extension

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- Enumerations
create type user_role as enum ('owner', 'staff', 'customer');
create type vehicle_status as enum ('available', 'maintenance', 'retired');
create type extra_pricing_type as enum ('per_day', 'one_time');
create type promo_type as enum ('percent', 'fixed');
create type booking_status as enum ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'no_show');
create type payment_status as enum ('unpaid', 'deposit_paid', 'paid', 'refunded');
create type inspection_type as enum ('checkin', 'checkout');
create type lead_type as enum ('contact', 'long_term');

-- Profiles linked to Supabase Auth
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Site settings (key/value jsonb editable from admin)
create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Locations
create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  phone text not null,
  opening_hours jsonb not null default '{}'::jsonb,
  pickup_instructions_it text not null,
  is_pickup boolean not null default true,
  is_dropoff boolean not null default true,
  out_of_hours_fee_cents integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vehicle Categories
create table public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_it text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vehicle Models
create table public.vehicle_models (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.vehicle_categories(id) on delete restrict,
  slug text unique not null,
  brand text not null,
  name text not null,
  seats integer not null,
  bags integer not null,
  doors integer not null,
  transmission text not null,
  fuel text not null,
  has_ac boolean not null default true,
  description_it text not null,
  images text[] not null default '{}',
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Concrete Fleet Vehicles
create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(id) on delete cascade,
  plate text unique not null,
  color text not null,
  mileage integer not null default 0,
  status vehicle_status not null default 'available',
  insurance_expiry date,
  service_due date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Duration & Seasonal Rates
create table public.rates (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.vehicle_models(id) on delete cascade,
  season_start date,
  season_end date,
  min_days integer not null,
  max_days integer not null,
  daily_price_cents integer not null,
  km_included text not null default 'Illimitati',
  deposit_cents integer not null default 30000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Extras
create table public.extras (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_it text not null,
  description_it text not null,
  price_cents integer not null,
  pricing_type extra_pricing_type not null default 'per_day',
  max_qty integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Promo Codes
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type promo_type not null,
  value integer not null,
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  max_uses integer not null default 100,
  used_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) on delete set null,
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  birth_date date not null,
  licence_number text not null,
  licence_issue_date date not null,
  licence_doc_path text,
  id_doc_path text,
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bookings with GiST exclusion constraint to prevent double booking
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  model_id uuid not null references public.vehicle_models(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  pickup_location_id uuid not null references public.locations(id),
  dropoff_location_id uuid not null references public.locations(id),
  pickup_at timestamptz not null,
  dropoff_at timestamptz not null,
  period tstzrange generated always as (tstzrange(pickup_at, dropoff_at, '[)')) stored,
  status booking_status not null default 'pending',
  subtotal_cents integer not null,
  extras_cents integer not null default 0,
  fees_cents integer not null default 0,
  discount_cents integer not null default 0,
  total_cents integer not null,
  deposit_cents integer not null,
  payment_status payment_status not null default 'unpaid',
  stripe_payment_intent text,
  source text default 'web',
  utm jsonb default '{}'::jsonb,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_overlapping_active_bookings exclude using gist (
    vehicle_id with =,
    period with &&
  ) where (status in ('pending', 'confirmed', 'active'))
);

create table public.booking_extras (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  extra_id uuid not null references public.extras(id) on delete restrict,
  quantity integer not null default 1,
  price_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  period tstzrange not null,
  reason text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  type inspection_type not null,
  photos text[] not null default '{}',
  notes text default '',
  fuel_level text not null,
  mileage integer not null,
  signed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  author_name text not null,
  rating integer not null check (rating between 1 and 5),
  text_it text not null,
  source text not null,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  url text not null,
  thumbnail_url text not null,
  caption text not null,
  sort_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question_it text not null,
  answer_it text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  type lead_type not null,
  name text not null,
  email text not null,
  phone text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helper function for RLS role checks
create or replace function public.is_admin_or_staff()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('owner', 'staff')
  );
$$;

-- Enable Row Level Security on every table
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.locations enable row level security;
alter table public.vehicle_categories enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicles enable row level security;
alter table public.rates enable row level security;
alter table public.extras enable row level security;
alter table public.promo_codes enable row level security;
alter table public.customers enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_extras enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.inspections enable row level security;
alter table public.reviews enable row level security;
alter table public.social_posts enable row level security;
alter table public.faqs enable row level security;
alter table public.leads enable row level security;

-- Public read policies for catalog & content
create policy "Public read active locations" on public.locations for select using (is_active = true);
create policy "Public read categories" on public.vehicle_categories for select using (true);
create policy "Public read active models" on public.vehicle_models for select using (is_active = true);
create policy "Public read rates" on public.rates for select using (true);
create policy "Public read active extras" on public.extras for select using (is_active = true);
create policy "Public read faqs" on public.faqs for select using (true);
create policy "Public read published reviews" on public.reviews for select using (is_published = true);
create policy "Public read published social posts" on public.social_posts for select using (is_published = true);
create policy "Public read non-sensitive settings" on public.site_settings for select using (true);

-- Customer own-row access
create policy "Customers read own profile" on public.customers for select using (auth.uid() = auth_user_id);
create policy "Customers read own bookings" on public.bookings for select using (
  exists (
    select 1 from public.customers c
    where c.id = bookings.customer_id and c.auth_user_id = auth.uid()
  )
);

-- Owner & Staff full access
create policy "Staff full access all" on public.profiles for all using (public.is_admin_or_staff());
create policy "Staff full settings" on public.site_settings for all using (public.is_admin_or_staff());
create policy "Staff full locations" on public.locations for all using (public.is_admin_or_staff());
create policy "Staff full categories" on public.vehicle_categories for all using (public.is_admin_or_staff());
create policy "Staff full models" on public.vehicle_models for all using (public.is_admin_or_staff());
create policy "Staff full vehicles" on public.vehicles for all using (public.is_admin_or_staff());
create policy "Staff full rates" on public.rates for all using (public.is_admin_or_staff());
create policy "Staff full extras" on public.extras for all using (public.is_admin_or_staff());
create policy "Staff full promos" on public.promo_codes for all using (public.is_admin_or_staff());
create policy "Staff full customers" on public.customers for all using (public.is_admin_or_staff());
create policy "Staff full bookings" on public.bookings for all using (public.is_admin_or_staff());
create policy "Staff full booking_extras" on public.booking_extras for all using (public.is_admin_or_staff());
create policy "Staff full blocked_dates" on public.blocked_dates for all using (public.is_admin_or_staff());
create policy "Staff full inspections" on public.inspections for all using (public.is_admin_or_staff());
create policy "Staff full reviews" on public.reviews for all using (public.is_admin_or_staff());
create policy "Staff full social_posts" on public.social_posts for all using (public.is_admin_or_staff());
create policy "Staff full faqs" on public.faqs for all using (public.is_admin_or_staff());
create policy "Staff full leads" on public.leads for all using (public.is_admin_or_staff());
