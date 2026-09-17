-- chefconnect :: 0017_waitlists.sql
-- Waitlists: when a session is full, a guest can ask to be told if a seat opens.
-- When an individual booking is cancelled and a seat frees, everyone waitlisted
-- for that seat type is notified to book fast. A full-session cancellation does
-- NOT notify (there's nothing to grab). Depends on 0001-0016.

create table waitlist_entries (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  user_id    uuid not null references users(id) on delete cascade,
  seat_type  seat_type not null,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create index waitlist_session_idx on waitlist_entries (session_id, seat_type);

alter table waitlist_entries enable row level security;
create policy "waitlist: own" on waitlist_entries for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- RPC: join_waitlist ----------
create or replace function join_waitlist(p_session_id uuid, p_seat_type seat_type)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user    uuid := auth.uid();
  v_session sessions%rowtype;
begin
  if v_user is null then
    raise exception 'Sign in to join a waitlist' using errcode = 'insufficient_privilege';
  end if;
  select * into v_session from sessions where id = p_session_id;
  if v_session.id is null or v_session.status <> 'scheduled' or v_session.starts_at <= now() then
    raise exception 'This session is not open' using errcode = 'check_violation';
  end if;
  if (p_seat_type = 'in_person' and v_session.format = 'virtual')
     or (p_seat_type = 'virtual' and v_session.format = 'in_person') then
    raise exception 'Session does not offer % seats', p_seat_type using errcode = 'check_violation';
  end if;
  if exists (
    select 1 from classes c join chef_profiles cp on cp.id = c.chef_profile_id
     where c.id = v_session.class_id and cp.user_id = v_user
  ) then
    raise exception 'This is your own class' using errcode = 'check_violation';
  end if;
  if exists (select 1 from bookings where session_id = p_session_id and user_id = v_user and status <> 'cancelled') then
    raise exception 'You already have a booking for this session' using errcode = 'check_violation';
  end if;

  insert into waitlist_entries (session_id, user_id, seat_type)
  values (p_session_id, v_user, p_seat_type)
  on conflict (session_id, user_id) do update set seat_type = excluded.seat_type;
end;
$$;

-- ---------- notify waitlist when a seat frees ----------
create or replace function notify_waitlist_on_free()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session sessions%rowtype;
  v_title   text;
begin
  if not (old.status in ('confirmed', 'attended') and new.status = 'cancelled') then
    return null;
  end if;
  select * into v_session from sessions where id = new.session_id;
  -- only when the session itself is still live (not a full-session cancellation)
  if v_session.status <> 'scheduled' or v_session.starts_at <= now() then
    return null;
  end if;

  select title into v_title from classes where id = v_session.class_id;
  insert into notifications (user_id, kind, title, body, data)
  select w.user_id, 'waitlist_open', 'A spot opened: ' || v_title,
         'A seat just opened in a class you''re waitlisted for. Book before it fills.',
         jsonb_build_object('session_id', new.session_id, 'class_id', v_session.class_id)
    from waitlist_entries w
   where w.session_id = new.session_id and w.seat_type = new.seat_type and w.user_id <> new.user_id;
  return null;
end;
$$;

create trigger trg_notify_waitlist_on_free
  after update of status on bookings
  for each row execute function notify_waitlist_on_free();

-- ---------- grants ----------
grant select, insert, update, delete on waitlist_entries to authenticated;
grant all on waitlist_entries to service_role;
revoke execute on function join_waitlist from public, anon;
grant execute on function join_waitlist to authenticated;
