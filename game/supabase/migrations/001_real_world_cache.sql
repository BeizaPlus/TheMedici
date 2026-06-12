-- MeWorld Real World story cache (DeepSeek + YouTube links per CCS case)
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

create table if not exists public.real_world_cache (
  case_id integer primary key,
  stories jsonb not null default '[]'::jsonb,
  model text,
  web_search_queries jsonb not null default '[]'::jsonb,
  grounding_chunks jsonb not null default '[]'::jsonb,
  cached_at timestamptz not null default now()
);

create index if not exists real_world_cache_cached_at_idx
  on public.real_world_cache (cached_at desc);

alter table public.real_world_cache enable row level security;

-- Public read (frontend can use anon key later if needed)
drop policy if exists "real_world_cache_public_read" on public.real_world_cache;
create policy "real_world_cache_public_read"
  on public.real_world_cache
  for select
  using (true);

-- Writes use service_role key from the Node API only (bypasses RLS)
