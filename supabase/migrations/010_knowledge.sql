-- Mission 010: private knowledge and resources.
create table if not exists public.knowledge_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note','link','document','reference')),
  title text not null check (char_length(trim(title)) between 1 and 240),
  content text check (content is null or char_length(content) <= 50000),
  url text check (url is null or char_length(url) <= 2000),
  tags text[] not null default '{}', metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists knowledge_user_updated_idx on public.knowledge_items(user_id,updated_at desc);
create index if not exists knowledge_tags_idx on public.knowledge_items using gin(tags);
alter table public.knowledge_items enable row level security;
drop policy if exists "Users manage their knowledge" on public.knowledge_items;
create policy "Users manage their knowledge" on public.knowledge_items for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop trigger if exists knowledge_set_updated_at on public.knowledge_items;
create trigger knowledge_set_updated_at before update on public.knowledge_items for each row execute function public.set_updated_at();
