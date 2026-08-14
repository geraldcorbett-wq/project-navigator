-- Package 6: pin limits and circle search.
-- Safe to run more than once.

alter table public.profiles
  add column if not exists memory_pin_limit smallint not null default 3;

alter table public.profiles
  drop constraint if exists profiles_memory_pin_limit_check;

alter table public.profiles
  add constraint profiles_memory_pin_limit_check
  check (memory_pin_limit between 3 and 5);

alter table public.circles
  add column if not exists is_pinned boolean not null default false;

create index if not exists circles_user_pinned_updated_idx
  on public.circles(user_id, is_pinned desc, updated_at desc);
