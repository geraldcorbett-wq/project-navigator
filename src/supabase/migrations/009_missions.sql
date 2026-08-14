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
