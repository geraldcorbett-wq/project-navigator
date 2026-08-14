-- Mission 014: complete memory engine.
alter table public.memories
  add column if not exists is_pinned boolean not null default false;

create index if not exists memories_user_pinned_updated_idx
  on public.memories(user_id, is_pinned desc, updated_at desc);

create table if not exists public.memory_conversations (
  memory_id uuid not null references public.memories(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (memory_id, conversation_id)
);

create index if not exists memory_conversations_user_conversation_idx
  on public.memory_conversations(user_id, conversation_id, created_at desc);

alter table public.memory_conversations enable row level security;
drop policy if exists "Users manage their memory links" on public.memory_conversations;
create policy "Users manage their memory links"
  on public.memory_conversations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
