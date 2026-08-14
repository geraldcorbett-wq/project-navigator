-- Package 7: schedule pinning and dashboard support.
alter table public.schedule_items add column if not exists is_pinned boolean not null default false;
create index if not exists schedule_items_user_pinned_starts_idx on public.schedule_items(user_id, is_pinned desc, starts_at asc);
