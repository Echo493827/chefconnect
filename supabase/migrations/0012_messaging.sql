-- chefconnect :: 0012_messaging.sql
-- "Ask the chef about this class." A message thread is scoped to one class and
-- one guest (the person asking); the other participant is the class's chef. Both
-- sides read and reply; each new message notifies the recipient through the same
-- notifications inbox. Depends on 0001-0011.

create table message_threads (
  id                 uuid primary key default gen_random_uuid(),
  class_id           uuid not null references classes(id) on delete cascade,
  guest_id           uuid not null references users(id) on delete cascade, -- the person asking
  chef_profile_id    uuid not null references chef_profiles(id) on delete cascade,
  last_message_at    timestamptz,
  guest_last_read_at timestamptz,
  chef_last_read_at  timestamptz,
  created_at         timestamptz not null default now(),
  unique (class_id, guest_id) -- one ongoing thread per guest per class
);

create index message_threads_guest_idx on message_threads (guest_id, last_message_at desc);
create index message_threads_chef_idx  on message_threads (chef_profile_id, last_message_at desc);

create table messages (
  id         uuid primary key default gen_random_uuid(),
  thread_id  uuid not null references message_threads(id) on delete cascade,
  sender_id  uuid not null references users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index messages_thread_idx on messages (thread_id, created_at);

-- SECURITY DEFINER participant check so message policies don't recurse through
-- the thread's own RLS.
create or replace function is_thread_participant(p_thread_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from message_threads t
      join chef_profiles cp on cp.id = t.chef_profile_id
     where t.id = p_thread_id
       and (t.guest_id = auth.uid() or cp.user_id = auth.uid())
  )
$$;

-- ---------- RLS ----------
alter table message_threads enable row level security;
-- visible to the guest and to the class's chef; created only via start_thread()
create policy "threads: participant read" on message_threads for select using (
  guest_id = auth.uid() or chef_profile_id = current_chef_profile_id()
);
-- participants may update their own read timestamps
create policy "threads: participant update" on message_threads for update
  using (guest_id = auth.uid() or chef_profile_id = current_chef_profile_id())
  with check (guest_id = auth.uid() or chef_profile_id = current_chef_profile_id());

alter table messages enable row level security;
create policy "messages: participant read" on messages for select using (is_thread_participant(thread_id));
create policy "messages: participant send" on messages for insert
  with check (sender_id = auth.uid() and is_thread_participant(thread_id));

-- ---------- RPC: start_thread ----------
-- Get (or create) the caller's thread for a class. You can't message your own
-- class, and only published classes are open to questions.
create or replace function start_thread(p_class_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chef      uuid;
  v_chef_user uuid;
  v_id        uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to message a chef' using errcode = 'insufficient_privilege';
  end if;

  select c.chef_profile_id, cp.user_id into v_chef, v_chef_user
    from classes c join chef_profiles cp on cp.id = c.chef_profile_id
   where c.id = p_class_id and c.status = 'published';
  if v_chef is null then
    raise exception 'This class is not available' using errcode = 'no_data_found';
  end if;
  if v_chef_user = auth.uid() then
    raise exception 'This is your own class' using errcode = 'check_violation';
  end if;

  insert into message_threads (class_id, guest_id, chef_profile_id)
  values (p_class_id, auth.uid(), v_chef)
  on conflict (class_id, guest_id) do update set class_id = excluded.class_id
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- notify on new message ----------
create or replace function notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_thread    message_threads%rowtype;
  v_chef_user uuid;
  v_recipient uuid;
  v_title     text;
  v_sender    text;
begin
  select * into v_thread from message_threads where id = new.thread_id;
  select user_id into v_chef_user from chef_profiles where id = v_thread.chef_profile_id;

  update message_threads set last_message_at = new.created_at where id = new.thread_id;

  -- recipient is whichever participant didn't send this message
  v_recipient := case when new.sender_id = v_thread.guest_id then v_chef_user else v_thread.guest_id end;
  select title into v_title from classes where id = v_thread.class_id;
  select display_name into v_sender from users where id = new.sender_id;

  insert into notifications (user_id, kind, title, body, data)
  values (
    v_recipient,
    'message',
    'New message about ' || v_title,
    v_sender || ': ' || left(new.body, 120),
    jsonb_build_object('thread_id', new.thread_id, 'class_id', v_thread.class_id)
  );
  return null;
end;
$$;

create trigger trg_notify_new_message
  after insert on messages
  for each row execute function notify_new_message();

-- ---------- grants ----------
grant select, update on message_threads to authenticated;
grant select, insert on messages to authenticated;
grant all on message_threads, messages to service_role;
grant execute on function is_thread_participant to authenticated;
revoke execute on function start_thread from public, anon;
grant execute on function start_thread to authenticated;
