-- Mission 004.1: identity and interface foundation.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text not null default 'Me' check (char_length(trim(preferred_name)) between 1 and 80),
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  preferred_language text not null default 'en-US' check (char_length(trim(preferred_language)) between 1 and 35),
  time_zone text not null default 'UTC' check (char_length(trim(time_zone)) between 1 and 80),
  navigator_name text not null default 'Navigator' check (char_length(trim(navigator_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists preferred_name text not null default 'Me';
alter table public.profiles add column if not exists preferred_language text not null default 'en-US';
alter table public.profiles add column if not exists navigator_name text not null default 'Navigator';

alter table public.profiles enable row level security;
drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
