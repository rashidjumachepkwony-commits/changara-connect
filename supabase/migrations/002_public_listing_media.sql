alter table if exists public.businesses
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table if exists public.products
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table if exists public.jobs
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table if exists public.rentals
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table if exists public.notices
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table if exists public.advertisements
  add column if not exists media jsonb not null default '[]'::jsonb;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads',
  'uploads',
  true,
  52428800,
  array[
    'image/jpeg', 'image/png', 'image/webp',
    'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
