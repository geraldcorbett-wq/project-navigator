-- Mission 007: the Human's current orientation and working context.
create table if not exists public.orientation (
  user_id uuid primary key references auth.users(id) on delete cascade,
  situation text check (situation is null or char_length(situation) <= 4000),
  focus text check (focus is null or char_length(focus) <= 1000),
  desired_outcome text check (desired_outcome is null or char_length(desired_outcome) <= 2000),
  constraints text check (constraints is null or char_length(constraints) <= 4000),
  context jsonb not null default '{}'::jsonb check (jsonb_typeof(context) = 'object'),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orientation enable row level security;

drop policy if exists "Users can read their orientation" on public.orientation;
create policy "Users can read their orientation"
on public.orientation for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their orientation" on public.orientation;
create policy "Users can create their orientation"
on public.orientation for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their orientation" on public.orientation;
create policy "Users can update their orientation"
on public.orientation for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can clear their orientation" on public.orientation;
create policy "Users can clear their orientation"
on public.orientation for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.prepare_orientation_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    new.revision = old.revision + 1;
    new.created_at = old.created_at;
    new.user_id = old.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists orientation_prepare_update on public.orientation;
create trigger orientation_prepare_update
before insert or update on public.orientation
for each row execute function public.prepare_orientation_update();

create or replace function public.log_orientation_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_navigator_event(
      new.user_id,
      'orientation.created',
      'orientation',
      new.user_id,
      jsonb_build_object('revision', new.revision)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform public.write_navigator_event(
      new.user_id,
      'orientation.updated',
      'orientation',
      new.user_id,
      jsonb_build_object(
        'revision', new.revision,
        'situation_changed', old.situation is distinct from new.situation,
        'focus_changed', old.focus is distinct from new.focus,
        'desired_outcome_changed', old.desired_outcome is distinct from new.desired_outcome,
        'constraints_changed', old.constraints is distinct from new.constraints,
        'context_changed', old.context is distinct from new.context
      )
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform public.write_navigator_event(
      old.user_id,
      'orientation.cleared',
      'orientation',
      old.user_id,
      jsonb_build_object('revision', old.revision)
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists orientation_log_event on public.orientation;
create trigger orientation_log_event
after insert or update or delete on public.orientation
for each row execute function public.log_orientation_event();
