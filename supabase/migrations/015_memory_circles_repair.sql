-- Package 5: repair and complete Circles + Memory.
-- Safe to run more than once.

create extension if not exists pgcrypto;

-- Circles
create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.circle_members (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 120),
  email text,
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now()
);

create unique index if not exists circle_members_circle_email_unique
  on public.circle_members(circle_id, email)
  where email is not null;
create index if not exists circles_user_id_idx on public.circles(user_id);
create index if not exists circle_members_circle_id_idx on public.circle_members(circle_id);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;

drop policy if exists "Users manage their own circles" on public.circles;
create policy "Users manage their own circles" on public.circles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage members of their circles" on public.circle_members;
create policy "Users manage members of their circles" on public.circle_members
  for all to authenticated
  using (exists (
    select 1 from public.circles c
    where c.id = circle_id and c.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.circles c
    where c.id = circle_id and c.user_id = (select auth.uid())
  ));

-- Memory
create table if not exists public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 8000),
  category text not null default 'general' check (char_length(trim(category)) between 1 and 80),
  importance smallint not null default 3 check (importance between 1 and 5),
  source_conversation_id uuid references public.conversations(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.memories add column if not exists category text not null default 'general';
alter table public.memories add column if not exists importance smallint not null default 3;
alter table public.memories add column if not exists source_conversation_id uuid references public.conversations(id) on delete set null;
alter table public.memories add column if not exists metadata jsonb not null default '{}'::jsonb;
alter table public.memories add column if not exists is_pinned boolean not null default false;
alter table public.memories add column if not exists created_at timestamptz not null default now();
alter table public.memories add column if not exists updated_at timestamptz not null default now();

create index if not exists memories_user_updated_idx on public.memories(user_id, updated_at desc);
create index if not exists memories_user_category_idx on public.memories(user_id, category);
create index if not exists memories_user_pinned_importance_idx
  on public.memories(user_id, is_pinned desc, importance desc, updated_at desc);

alter table public.memories enable row level security;
drop policy if exists "Users manage their memories" on public.memories;
create policy "Users manage their memories" on public.memories
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

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
create policy "Users manage their memory links" on public.memory_conversations
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
