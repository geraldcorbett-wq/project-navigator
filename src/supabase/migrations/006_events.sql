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
