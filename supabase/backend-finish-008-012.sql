-- Project Navigator v1.0.1 backend completion
-- Run once after migrations 004-007. Safe to rerun.

-- ===== 008_memories.sql =====
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

-- ===== 009_missions.sql =====
-- Mission 009: missions and task state.
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  description text check (description is null or char_length(description) <= 8000),
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  due_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240),
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled')),
  position integer not null default 0,
  due_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists missions_user_status_idx on public.missions(user_id,status,updated_at desc);
create index if not exists tasks_mission_position_idx on public.tasks(mission_id,position,created_at);
alter table public.missions enable row level security; alter table public.tasks enable row level security;
drop policy if exists "Users manage their missions" on public.missions;
create policy "Users manage their missions" on public.missions for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop policy if exists "Users manage their tasks" on public.tasks;
create policy "Users manage their tasks" on public.tasks for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
drop trigger if exists missions_set_updated_at on public.missions;
create trigger missions_set_updated_at before update on public.missions for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks for each row execute function public.set_updated_at();

-- ===== 010_knowledge.sql =====
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

-- ===== 011_notifications.sql =====
-- Mission 011: notification inbox and delivery queue.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 240), body text check (body is null or char_length(body)<=8000),
  type text not null default 'info' check (char_length(trim(type)) between 1 and 80),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object'), read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx on public.notifications(user_id,read_at,created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "Users read and update their notifications" on public.notifications;
create policy "Users read and update their notifications" on public.notifications for select to authenticated using ((select auth.uid())=user_id);
create policy "Users update their notifications" on public.notifications for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);

-- ===== 012_jobs.sql =====
-- Mission 012: background job contracts.
create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  job_type text not null check (char_length(trim(job_type)) between 1 and 120),
  status text not null default 'queued' check (status in ('queued','running','completed','failed','cancelled')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object'), result jsonb,
  attempts integer not null default 0 check (attempts>=0), run_after timestamptz not null default now(),
  started_at timestamptz, completed_at timestamptz, error text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists jobs_user_status_idx on public.background_jobs(user_id,status,run_after);
alter table public.background_jobs enable row level security;
drop policy if exists "Users read their jobs" on public.background_jobs;
create policy "Users read their jobs" on public.background_jobs for select to authenticated using ((select auth.uid())=user_id);
drop policy if exists "Users queue their jobs" on public.background_jobs;
create policy "Users queue their jobs" on public.background_jobs for insert to authenticated with check ((select auth.uid())=user_id);
drop trigger if exists jobs_set_updated_at on public.background_jobs;
create trigger jobs_set_updated_at before update on public.background_jobs for each row execute function public.set_updated_at();
