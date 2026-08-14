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
