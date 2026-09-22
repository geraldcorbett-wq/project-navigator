-- Navigator 2.0 containment and shared-circle access.
create extension if not exists pgcrypto;

alter table public.circle_members add column if not exists relationship_label text;

create table if not exists public.circle_responses (
  id uuid primary key default gen_random_uuid(),
  circle_id uuid not null references public.circles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists circle_responses_circle_created_idx on public.circle_responses(circle_id, created_at);
alter table public.circle_responses enable row level security;

create table if not exists public.contact_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  circle_member_id uuid not null references public.circle_members(id) on delete cascade,
  interaction_kind text not null default 'navigator' check (char_length(trim(interaction_kind)) between 1 and 80),
  occurred_at timestamptz not null default now()
);
create index if not exists contact_interactions_user_recent_idx on public.contact_interactions(user_id, occurred_at desc);
alter table public.contact_interactions enable row level security;

drop policy if exists "Users manage their contact interactions" on public.contact_interactions;
drop policy if exists "Users view their contact interactions" on public.contact_interactions;
create policy "Users view their contact interactions" on public.contact_interactions for select to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.navigator_is_circle_owner(p_circle_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.circles where id=p_circle_id and user_id=(select auth.uid()));
$$;
create or replace function public.navigator_is_circle_member(p_circle_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select public.navigator_is_circle_owner(p_circle_id) or exists(
    select 1 from public.circle_members where circle_id=p_circle_id and user_id=(select auth.uid())
  );
$$;
revoke all on function public.navigator_is_circle_owner(uuid) from public;
revoke all on function public.navigator_is_circle_member(uuid) from public;
grant execute on function public.navigator_is_circle_owner(uuid) to authenticated;
grant execute on function public.navigator_is_circle_member(uuid) to authenticated;

drop policy if exists "Circle members view circles" on public.circles;
create policy "Circle members view circles" on public.circles for select to authenticated
  using (public.navigator_is_circle_member(id));

drop policy if exists "Circle members view membership" on public.circle_members;
create policy "Circle members view membership" on public.circle_members for select to authenticated
  using (public.navigator_is_circle_member(circle_id));

drop policy if exists "Circle members view responses" on public.circle_responses;
create policy "Circle members view responses" on public.circle_responses for select to authenticated
  using (public.navigator_is_circle_member(circle_id));
drop policy if exists "Circle members respond" on public.circle_responses;
create policy "Circle members respond" on public.circle_responses for insert to authenticated
  with check ((select auth.uid()) = user_id and public.navigator_is_circle_member(circle_id));
drop policy if exists "Owners moderate responses" on public.circle_responses;
create policy "Owners moderate responses" on public.circle_responses for delete to authenticated
  using (public.navigator_is_circle_owner(circle_id));

-- AI consumption is internal operational data. Users cannot forge or mutate it directly.
create table if not exists public.navigator_ai_usage (
  request_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  ip_hash text,
  input_chars integer not null default 0,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  status text not null default 'started' check (status in ('started','completed','failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists navigator_ai_usage_user_recent_idx on public.navigator_ai_usage(user_id, created_at desc);
create index if not exists navigator_ai_usage_ip_recent_idx on public.navigator_ai_usage(ip_hash, created_at desc) where ip_hash is not null;
alter table public.navigator_ai_usage enable row level security;

create table if not exists public.navigator_ai_leases (
  request_id uuid primary key references public.navigator_ai_usage(request_id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null
);
create index if not exists navigator_ai_leases_user_idx on public.navigator_ai_leases(user_id, expires_at);
alter table public.navigator_ai_leases enable row level security;

create or replace function public.navigator_ai_admit(p_user_id uuid, p_ip_hash text, p_input_chars integer)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_user uuid := p_user_id;
  v_request uuid := gen_random_uuid();
  v_count integer;
begin
  if v_user is null or not exists(select 1 from auth.users where id=v_user) then raise exception 'NAV_AUTH'; end if;
  if p_input_chars < 1 or p_input_chars > 8000 then raise exception 'NAV_INPUT'; end if;
  delete from public.navigator_ai_leases where expires_at < now();
  select count(*) into v_count from public.navigator_ai_leases where user_id=v_user;
  if v_count >= 2 then raise exception 'NAV_BUSY'; end if;
  select count(*) into v_count from public.navigator_ai_usage where user_id=v_user and created_at > now() - interval '1 minute';
  if v_count >= 30 then raise exception 'NAV_RATE'; end if;
  if p_ip_hash is not null then
    select count(*) into v_count from public.navigator_ai_usage where ip_hash=p_ip_hash and created_at > now() - interval '1 minute';
    if v_count >= 60 then raise exception 'NAV_RATE'; end if;
  end if;
  insert into public.navigator_ai_usage(request_id,user_id,ip_hash,input_chars) values(v_request,v_user,p_ip_hash,p_input_chars);
  insert into public.navigator_ai_leases(request_id,user_id,expires_at) values(v_request,v_user,now()+interval '90 seconds');
  return v_request;
end; $$;

create or replace function public.navigator_ai_finish(p_user_id uuid, p_request_id uuid, p_status text, p_input_tokens integer, p_output_tokens integer, p_total_tokens integer)
returns void language plpgsql security definer set search_path=public as $$
declare v_user uuid := p_user_id;
begin
  if v_user is null then raise exception 'NAV_AUTH'; end if;
  update public.navigator_ai_usage set
    status=case when p_status='completed' then 'completed' else 'failed' end,
    input_tokens=p_input_tokens, output_tokens=p_output_tokens, total_tokens=p_total_tokens,
    completed_at=now()
  where request_id=p_request_id and user_id=v_user;
  delete from public.navigator_ai_leases where request_id=p_request_id and user_id=v_user;
end; $$;

revoke all on function public.navigator_ai_admit(uuid,text,integer) from public, authenticated;
revoke all on function public.navigator_ai_finish(uuid,uuid,text,integer,integer,integer) from public, authenticated;
grant execute on function public.navigator_ai_admit(uuid,text,integer) to service_role;
grant execute on function public.navigator_ai_finish(uuid,uuid,text,integer,integer,integer) to service_role;

create or replace function public.navigator_ai_monthly_totals(p_month date)
returns table(requests bigint, active_users bigint, input_tokens bigint, output_tokens bigint, total_tokens bigint)
language sql stable security definer set search_path=public as $$
  select count(*)::bigint,
         count(distinct user_id)::bigint,
         coalesce(sum(input_tokens),0)::bigint,
         coalesce(sum(output_tokens),0)::bigint,
         coalesce(sum(total_tokens),0)::bigint
  from public.navigator_ai_usage
  where created_at >= date_trunc('month', p_month::timestamp)
    and created_at < date_trunc('month', p_month::timestamp) + interval '1 month';
$$;
revoke all on function public.navigator_ai_monthly_totals(date) from public, authenticated;
grant execute on function public.navigator_ai_monthly_totals(date) to service_role;
