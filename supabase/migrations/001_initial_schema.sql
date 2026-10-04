create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text unique not null,
  password_hash text,
  role text not null default 'USER' check (role in ('USER', 'BUSINESS_OWNER', 'ADMIN')),
  location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete set null,
  name text not null,
  slug text not null unique,
  category text not null,
  subcategory text,
  description text not null,
  phone text,
  whatsapp text,
  email text,
  location text not null,
  village text,
  opening_hours text,
  services text[] default '{}',
  logo_url text,
  image_urls text[] default '{}',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  listing_type text default 'STANDARD',
  views integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references users(id) on delete set null,
  name text not null,
  slug text not null unique,
  category text,
  description text,
  price numeric(12,2),
  unit text,
  location text,
  images text[] default '{}',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  poster_id uuid references users(id) on delete set null,
  title text not null,
  slug text unique,
  company text,
  category text,
  location text,
  type text,
  description text,
  pay text,
  phone text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rentals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete set null,
  title text not null,
  slug text not null unique,
  property_type text not null,
  location text not null,
  price numeric(12,2),
  bedrooms integer,
  bathrooms integer,
  description text,
  images text[] default '{}',
  phone text,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists notices (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references users(id) on delete set null,
  title text not null,
  slug text unique,
  category text,
  description text,
  attachment_url text,
  priority text default 'NORMAL',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists advertisements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text,
  link_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  target_type text not null,
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  name text,
  phone text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references users(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  reason text not null,
  details text,
  created_at timestamptz not null default now()
);

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  subject text,
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete set null,
  amount numeric(12,2) not null default 0 check (amount >= 0),
  phone text,
  reference text unique,
  transaction_id text,
  mpesa_receipt text,
  payment_type text not null default 'manual',
  status text not null default 'PENDING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Additive compatibility columns for projects where an earlier scaffold
-- version of this migration was already applied. Existing rows are retained.
alter table users add column if not exists legacy_id text unique;
alter table users add column if not exists profile_image text;
alter table users add column if not exists verified boolean not null default false;
alter table users add column if not exists is_demo boolean not null default false;

alter table categories add column if not exists legacy_id text unique;
alter table categories add column if not exists "order" integer not null default 0;
alter table categories add column if not exists icons text not null default '';

alter table businesses add column if not exists legacy_id text unique;
alter table businesses add column if not exists admin_note text;
alter table businesses add column if not exists featured_until timestamptz;
alter table businesses add column if not exists verified boolean not null default false;
alter table businesses add column if not exists phone_clicks integer not null default 0;
alter table businesses add column if not exists whatsapp_clicks integer not null default 0;
alter table businesses add column if not exists is_demo boolean not null default false;

alter table products add column if not exists legacy_id text unique;
alter table products add column if not exists title text;
alter table products add column if not exists negotiable boolean not null default false;
alter table products add column if not exists condition text not null default 'Used';
alter table products add column if not exists phone text;
alter table products add column if not exists whatsapp text;
alter table products add column if not exists views integer not null default 0;
alter table products add column if not exists is_demo boolean not null default false;

alter table jobs add column if not exists legacy_id text unique;
alter table jobs add column if not exists slug text;
alter table jobs add column if not exists employer text;
alter table jobs add column if not exists salary numeric(12,2) not null default 0;
alter table jobs add column if not exists salary_type text not null default 'Negotiable';
alter table jobs add column if not exists whatsapp text;
alter table jobs add column if not exists application_instructions text;
alter table jobs add column if not exists closing_date timestamptz;
alter table jobs add column if not exists views integer not null default 0;
alter table jobs add column if not exists is_demo boolean not null default false;

alter table rentals add column if not exists legacy_id text unique;
alter table rentals add column if not exists rooms integer not null default 0;
alter table rentals add column if not exists whatsapp text;
alter table rentals add column if not exists available boolean not null default true;
alter table rentals add column if not exists views integer not null default 0;
alter table rentals add column if not exists is_demo boolean not null default false;

alter table notices add column if not exists legacy_id text unique;
alter table notices add column if not exists slug text;
alter table notices add column if not exists location text;
alter table notices add column if not exists contact text;
alter table notices add column if not exists image text;
alter table notices add column if not exists expiry_date timestamptz;
alter table notices add column if not exists views integer not null default 0;
alter table notices add column if not exists is_demo boolean not null default false;

alter table advertisements add column if not exists legacy_id text unique;
alter table advertisements add column if not exists description text;
alter table advertisements add column if not exists business_id uuid references businesses(id) on delete set null;
alter table advertisements add column if not exists placement text not null default 'homepage';
alter table advertisements add column if not exists start_date timestamptz;
alter table advertisements add column if not exists end_date timestamptz;
alter table advertisements add column if not exists is_demo boolean not null default false;

alter table favorites add column if not exists legacy_id text unique;
alter table inquiries add column if not exists legacy_id text unique;
alter table inquiries add column if not exists business_id uuid references businesses(id) on delete cascade;
alter table reports add column if not exists legacy_id text unique;
alter table reports add column if not exists status text not null default 'OPEN';
alter table contacts add column if not exists legacy_id text unique;
alter table contacts add column if not exists read boolean not null default false;
alter table payments add column if not exists legacy_id text unique;

-- Replace only status checks so the existing SUSPENDED state is representable.
alter table businesses drop constraint if exists businesses_status_check;
alter table businesses add constraint businesses_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));
alter table products drop constraint if exists products_status_check;
alter table products add constraint products_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));
alter table jobs drop constraint if exists jobs_status_check;
alter table jobs add constraint jobs_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));
alter table rentals drop constraint if exists rentals_status_check;
alter table rentals add constraint rentals_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));
alter table notices drop constraint if exists notices_status_check;
alter table notices add constraint notices_status_check
  check (status in ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'));

-- Keep existing names and timestamps, and expose lookup paths used by the
-- API when it receives a historical Mongo ObjectId or a public slug.
create unique index if not exists idx_businesses_slug on businesses(slug);
create unique index if not exists idx_products_slug on products(slug);
create unique index if not exists idx_jobs_slug on jobs(slug);
create unique index if not exists idx_rentals_slug on rentals(slug);
create unique index if not exists idx_notices_slug on notices(slug);
create unique index if not exists idx_categories_type_name on categories(type, name);
create index if not exists idx_users_phone on users(phone);
create index if not exists idx_businesses_owner on businesses(owner_id);
create index if not exists idx_businesses_status on businesses(status);
create index if not exists idx_products_seller on products(seller_id);
create index if not exists idx_rentals_owner on rentals(owner_id);
create index if not exists idx_notices_status on notices(status);
create index if not exists idx_jobs_poster on jobs(poster_id);
create index if not exists idx_favorites_user on favorites(user_id);
create index if not exists idx_inquiries_business on inquiries(business_id);
create index if not exists idx_reports_status on reports(status);
create index if not exists idx_advertisements_active_placement on advertisements(active, placement);
