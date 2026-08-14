create table if not exists public.entity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('memory','circle','schedule','conversation')),
  source_id uuid not null,
  target_type text not null check (target_type in ('memory','circle','schedule','conversation')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  check (not (source_type = target_type and source_id = target_id)),
  unique(user_id, source_type, source_id, target_type, target_id)
);
create index if not exists entity_links_source_idx on public.entity_links(user_id, source_type, source_id);
create index if not exists entity_links_target_idx on public.entity_links(user_id, target_type, target_id);
alter table public.entity_links enable row level security;
drop policy if exists "Users manage their own entity links" on public.entity_links;
create policy "Users manage their own entity links" on public.entity_links for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
