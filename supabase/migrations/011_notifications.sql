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
