-- chefconnect :: 0015_dm.sql
-- Stage 3 of the social layer: direct messages between friends, separate from
-- the class Q&A. One thread per pair (canonically ordered so A-B and B-A can't
-- both exist); you must be friends to start one; each message notifies the
-- recipient. Depends on 0001-0014.

create table dm_threads (
  id              uuid primary key default gen_random_uuid(),
  user_lo         uuid not null references users(id) on delete cascade,
  user_hi         uuid not null references users(id) on delete cascade,
  last_message_at timestamptz,
  lo_last_read_at timestamptz,
  hi_last_read_at timestamptz,
  created_at      timestamptz not null default now(),
  constraint dm_pair_order check (user_lo < user_hi),
  unique (user_lo, user_hi)
);

create index dm_threads_lo_idx on dm_threads (user_lo, last_message_at desc);
create index dm_threads_hi_idx on dm_threads (user_hi, last_message_at desc);

create table dm_messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references dm_threads(id) on delete cascade,
  sender_id  uuid not null references users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index dm_messages_thread_idx on dm_messages (thread_id, created_at);

create or replace function is_dm_participant(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from dm_threads t where t.id = p_thread_id and (t.user_lo = auth.uid() or t.user_hi = auth.uid())
  )
$$;

-- ---------- RLS ----------
alter table dm_threads enable row level security;
create policy "dm_threads: participant read" on dm_threads for select using (
  user_lo = auth.uid() or user_hi = auth.uid()
);
create policy "dm_threads: participant update" on dm_threads for update
  using (user_lo = auth.uid() or user_hi = auth.uid())
  with check (user_lo = auth.uid() or user_hi = auth.uid());

alter table dm_messages enable row level security;
create policy "dm_messages: participant read" on dm_messages for select using (is_dm_participant(thread_id));
create policy "dm_messages: participant send" on dm_messages for insert
  with check (sender_id = auth.uid() and is_dm_participant(thread_id));

-- ---------- RPC: start_dm ----------
-- Get (or create) the thread between the caller and a friend. Friends only.
create or replace function start_dm(p_friend uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_lo uuid;
  v_hi uuid;
  v_id uuid;
begin
  if v_me is null then
    raise exception 'Sign in to message' using errcode = 'insufficient_privilege';
  end if;
  if p_friend = v_me then
    raise exception 'You can''t message yourself' using errcode = 'check_violation';
  end if;
  if not are_friends(p_friend) then
    raise exception 'You can only message friends' using errcode = 'insufficient_privilege';
  end if;

  v_lo := least(v_me, p_friend);
  v_hi := greatest(v_me, p_friend);

  insert into dm_threads (user_lo, user_hi)
  values (v_lo, v_hi)
  on conflict (user_lo, user_hi) do update set user_lo = excluded.user_lo
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- notify on new DM ----------
create or replace function notify_new_dm()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread    dm_threads%rowtype;
  v_recipient uuid;
  v_sender    text;
begin
  select * into v_thread from dm_threads where id = new.thread_id;
  update dm_threads set last_message_at = new.created_at where id = new.thread_id;

  v_recipient := case when new.sender_id = v_thread.user_lo then v_thread.user_hi else v_thread.user_lo end;
  select display_name into v_sender from users where id = new.sender_id;

  insert into notifications (user_id, kind, title, body, data)
  values (v_recipient, 'dm', 'Message from ' || v_sender, left(new.body, 120),
          jsonb_build_object('dm_thread_id', new.thread_id));
  return null;
end;
$$;

create trigger trg_notify_new_dm
  after insert on dm_messages
  for each row execute function notify_new_dm();

-- ---------- grants ----------
grant select, update on dm_threads to authenticated;
grant select, insert on dm_messages to authenticated;
grant all on dm_threads, dm_messages to service_role;
grant execute on function is_dm_participant to authenticated;
revoke execute on function start_dm from public, anon;
grant execute on function start_dm to authenticated;
