-- Project Navigator v1.0.1 complete database setup

-- ===== 004_profiles.sql =====
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

-- ===== 005_conversations.sql =====
-- Mission 005: authenticated conversation persistence.
create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(trim(title)) between 1 and 160),
  summary text check (summary is null or char_length(summary) <= 2000),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null check (char_length(trim(content)) between 1 and 50000),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists conversations_user_last_message_idx
  on public.conversations(user_id, last_message_at desc);
create index if not exists conversations_user_status_idx
  on public.conversations(user_id, status);
create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at);
create index if not exists messages_user_idx
  on public.messages(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.touch_conversation_from_message()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.conversations
  set last_message_at = new.created_at,
      updated_at = now()
  where id = new.conversation_id
    and user_id = new.user_id;
  return new;
end;
$$;

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

drop trigger if exists messages_touch_conversation on public.messages;
create trigger messages_touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation_from_message();

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Users can read their conversations" on public.conversations;
create policy "Users can read their conversations"
on public.conversations for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their conversations" on public.conversations;
create policy "Users can create their conversations"
on public.conversations for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their conversations" on public.conversations;
create policy "Users can update their conversations"
on public.conversations for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete their conversations" on public.conversations;
create policy "Users can delete their conversations"
on public.conversations for delete to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read their messages" on public.messages;
create policy "Users can read their messages"
on public.messages for select to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can create their messages" on public.messages;
create policy "Users can create their messages"
on public.messages for insert to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete their messages" on public.messages;
create policy "Users can delete their messages"
on public.messages for delete to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1 from public.conversations c
    where c.id = conversation_id and c.user_id = (select auth.uid())
  )
);

-- ===== 006_events.sql =====
-- Mission 006: append-only event history and audit trail.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (char_length(trim(event_type)) between 1 and 120),
  entity_type text not null check (char_length(trim(entity_type)) between 1 and 80),
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default now()
);

create index if not exists events_user_occurred_idx
  on public.events(user_id, occurred_at desc);
create index if not exists events_user_type_idx
  on public.events(user_id, event_type, occurred_at desc);
create index if not exists events_entity_idx
  on public.events(user_id, entity_type, entity_id, occurred_at desc);

alter table public.events enable row level security;

drop policy if exists "Users can read their events" on public.events;
create policy "Users can read their events"
on public.events for select to authenticated
using ((select auth.uid()) = user_id);

-- No insert, update, or delete policy is intentionally provided.
-- Events are written only by trusted database trigger functions.

create or replace function public.write_navigator_event(
  p_user_id uuid,
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_payload jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.events (user_id, event_type, entity_type, entity_id, payload)
  values (
    p_user_id,
    p_event_type,
    p_entity_type,
    p_entity_id,
    coalesce(p_payload, '{}'::jsonb)
  );
end;
$$;

revoke all on function public.write_navigator_event(uuid, text, text, uuid, jsonb) from public;
revoke all on function public.write_navigator_event(uuid, text, text, uuid, jsonb) from anon;
revoke all on function public.write_navigator_event(uuid, text, text, uuid, jsonb) from authenticated;

create or replace function public.log_conversation_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.write_navigator_event(
      new.user_id,
      'conversation.created',
      'conversation',
      new.id,
      jsonb_build_object('title', new.title, 'status', new.status)
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if old.title is distinct from new.title
       or old.summary is distinct from new.summary
       or old.status is distinct from new.status then
      perform public.write_navigator_event(
        new.user_id,
        'conversation.updated',
        'conversation',
        new.id,
        jsonb_strip_nulls(jsonb_build_object(
          'title', case when old.title is distinct from new.title then new.title end,
          'summary_changed', case when old.summary is distinct from new.summary then true end,
          'status', case when old.status is distinct from new.status then new.status end
        ))
      );
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    perform public.write_navigator_event(
      old.user_id,
      'conversation.deleted',
      'conversation',
      old.id,
      jsonb_build_object('title', old.title, 'status', old.status)
    );
    return old;
  end if;
  return null;
end;
$$;

create or replace function public.log_message_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.write_navigator_event(
    new.user_id,
    'message.created',
    'message',
    new.id,
    jsonb_build_object(
      'conversation_id', new.conversation_id,
      'role', new.role,
      'content_length', char_length(new.content)
    )
  );
  return new;
end;
$$;

drop trigger if exists conversations_log_event on public.conversations;
create trigger conversations_log_event
after insert or update or delete on public.conversations
for each row execute function public.log_conversation_event();

drop trigger if exists messages_log_event on public.messages;
create trigger messages_log_event
after insert on public.messages
for each row execute function public.log_message_event();

-- ===== 007_orientation.sql =====
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

-- ===== 019_navigator_containment.sql =====
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
