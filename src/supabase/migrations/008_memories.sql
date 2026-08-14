-- Mission 008: private memory capture and retrieval.
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 8000),
  category text not null default 'general' check (char_length(trim(category)) between 1 and 80),
  importance smallint not null default 3 check (importance between 1 and 5),
  source_conversation_id uuid references public.conversations(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists memories_user_updated_idx on public.memories(user_id, updated_at desc);
create index if not exists memories_user_category_idx on public.memories(user_id, category);
alter table public.memories enable row level security;
drop policy if exists "Users manage their memories" on public.memories;
create policy "Users manage their memories" on public.memories for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop trigger if exists memories_set_updated_at on public.memories;
create trigger memories_set_updated_at before update on public.memories
for each row execute function public.set_updated_at();
