-- Package 2: circles and schedule.
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
  created_at timestamptz not null default now(),
  unique(circle_id, email)
);

create table if not exists public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  circle_id uuid references public.circles(id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  time_zone text not null default 'UTC',
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index if not exists circles_user_id_idx on public.circles(user_id);
create index if not exists circle_members_circle_id_idx on public.circle_members(circle_id);
create index if not exists schedule_items_user_starts_idx on public.schedule_items(user_id, starts_at);

alter table public.circles enable row level security;
alter table public.circle_members enable row level security;
alter table public.schedule_items enable row level security;

drop policy if exists "Users manage their own circles" on public.circles;
create policy "Users manage their own circles" on public.circles for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage members of their circles" on public.circle_members;
create policy "Users manage members of their circles" on public.circle_members for all to authenticated
using (exists (select 1 from public.circles c where c.id = circle_id and c.user_id = (select auth.uid())))
with check (exists (select 1 from public.circles c where c.id = circle_id and c.user_id = (select auth.uid())));

drop policy if exists "Users manage their own schedule" on public.schedule_items;
create policy "Users manage their own schedule" on public.schedule_items for all to authenticated
using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
