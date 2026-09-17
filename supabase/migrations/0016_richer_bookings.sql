-- chefconnect :: 0016_richer_bookings.sql
-- Richer bookings: book more than one seat at once, and note allergies/dietary
-- needs the chef should know. A booking now carries a quantity (1-10) and
-- optional dietary_notes. Seat claiming/releasing becomes quantity-aware, so the
-- overbooking guard still holds for a whole party at once. Depends on 0001-0015.

alter table bookings
  add column if not exists quantity integer not null default 1 check (quantity between 1 and 10),
  add column if not exists dietary_notes text check (char_length(dietary_notes) <= 1000);

-- ---------- quantity-aware seat claim / release ----------
-- Replace the single-seat versions. Claiming N is one conditional UPDATE, still
-- row-locked, so a party either fits entirely or the booking fails — no partial
-- or over-booking.
drop function if exists claim_seat(uuid, seat_type);
drop function if exists release_seat(uuid, seat_type);

create function claim_seat(p_session_id uuid, p_seat seat_type, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
declare v_rows integer;
begin
  if p_qty < 1 then
    raise exception 'Seat count must be at least 1' using errcode = 'check_violation';
  end if;
  if p_seat = 'in_person' then
    update sessions set inperson_booked = inperson_booked + p_qty
     where id = p_session_id and inperson_booked + p_qty <= inperson_capacity;
  else
    update sessions set virtual_booked = virtual_booked + p_qty
     where id = p_session_id and virtual_booked + p_qty <= virtual_capacity;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Not enough % seats left', p_seat using errcode = 'check_violation';
  end if;
end;
$$;

create function release_seat(p_session_id uuid, p_seat seat_type, p_qty integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_seat = 'in_person' then
    update sessions set inperson_booked = greatest(inperson_booked - p_qty, 0) where id = p_session_id;
  else
    update sessions set virtual_booked = greatest(virtual_booked - p_qty, 0) where id = p_session_id;
  end if;
end;
$$;

revoke execute on function claim_seat(uuid, seat_type, integer), release_seat(uuid, seat_type, integer) from public, anon, authenticated;

-- ---------- booking triggers, now passing quantity ----------
create or replace function validate_booking_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_session sessions%rowtype;
  v_waiver  waiver_acceptances%rowtype;
begin
  select * into v_session from sessions where id = new.session_id;
  if v_session.id is null then
    raise exception 'Session not found' using errcode = 'no_data_found';
  end if;
  if v_session.status <> 'scheduled' or v_session.starts_at <= now() then
    raise exception 'This session is no longer open for booking' using errcode = 'check_violation';
  end if;
  if (new.seat_type = 'in_person' and v_session.format = 'virtual')
     or (new.seat_type = 'virtual' and v_session.format = 'in_person') then
    raise exception 'Session does not offer % seats', new.seat_type using errcode = 'check_violation';
  end if;

  select * into v_waiver from waiver_acceptances where id = new.waiver_acceptance_id;
  if v_waiver.id is null or v_waiver.user_id <> new.user_id or v_waiver.session_id <> new.session_id then
    raise exception 'Waiver acceptance must belong to the same user and session' using errcode = 'check_violation';
  end if;

  if exists (
    select 1 from classes c join chef_profiles cp on cp.id = c.chef_profile_id
     where c.id = v_session.class_id and cp.user_id = new.user_id
  ) then
    raise exception 'Chefs cannot book their own session' using errcode = 'check_violation';
  end if;

  if new.status = 'confirmed' then
    perform claim_seat(new.session_id, new.seat_type, new.quantity);
  end if;
  return new;
end;
$$;

create or replace function validate_booking_update()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_session   sessions%rowtype;
  v_chef_user uuid;
  v_actor     uuid := auth.uid();
  v_was_live  boolean := old.status in ('confirmed', 'attended');
  v_is_live   boolean := new.status in ('confirmed', 'attended');
begin
  if new.session_id <> old.session_id or new.user_id <> old.user_id
     or new.seat_type <> old.seat_type or new.waiver_acceptance_id <> old.waiver_acceptance_id
     or new.quantity <> old.quantity then
    raise exception 'Booking identity fields cannot change' using errcode = 'check_violation';
  end if;

  if new.status = old.status then
    return new;
  end if;

  select * into v_session from sessions where id = new.session_id;
  select cp.user_id into v_chef_user
    from classes c join chef_profiles cp on cp.id = c.chef_profile_id
   where c.id = v_session.class_id;

  if v_actor is not null then
    if v_actor = old.user_id then
      if new.status <> 'cancelled' then
        raise exception 'Attendees can only cancel a booking' using errcode = 'insufficient_privilege';
      end if;
      if now() > v_session.starts_at - make_interval(hours => v_session.cancellation_cutoff_hours) then
        raise exception 'The cancellation window for this session has closed' using errcode = 'check_violation';
      end if;
    elsif v_actor = v_chef_user then
      if new.status not in ('confirmed', 'attended', 'no_show', 'cancelled') then
        raise exception 'Invalid booking status' using errcode = 'check_violation';
      end if;
    else
      raise exception 'Not allowed to change this booking' using errcode = 'insufficient_privilege';
    end if;
  end if;

  if new.status = 'cancelled' then
    new.cancelled_at = coalesce(new.cancelled_at, now());
  end if;

  if v_was_live and not v_is_live then
    perform release_seat(new.session_id, new.seat_type, old.quantity);
  elsif not v_was_live and v_is_live then
    perform claim_seat(new.session_id, new.seat_type, new.quantity);
  end if;
  return new;
end;
$$;

-- ---------- book_session with party size + dietary notes ----------
drop function if exists book_session(uuid, seat_type, text, inet, text);

create function book_session(
  p_session_id     uuid,
  p_seat_type      seat_type,
  p_waiver_version text,
  p_ip_address     inet default null,
  p_user_agent     text default null,
  p_quantity       integer default 1,
  p_dietary_notes  text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_qty    integer := greatest(1, least(coalesce(p_quantity, 1), 10));
  v_waiver uuid;
  v_id     uuid;
begin
  if v_user is null then
    raise exception 'Sign in to book a session' using errcode = 'insufficient_privilege';
  end if;
  if not exists (select 1 from waivers where version = p_waiver_version and is_current) then
    raise exception 'The waiver you accepted is out of date; please review the current one' using errcode = 'check_violation';
  end if;

  insert into waiver_acceptances (user_id, session_id, waiver_version, ip_address, user_agent)
  values (v_user, p_session_id, p_waiver_version, p_ip_address, left(p_user_agent, 500))
  returning id into v_waiver;

  insert into bookings (session_id, user_id, seat_type, waiver_acceptance_id, quantity, dietary_notes)
  values (p_session_id, v_user, p_seat_type, v_waiver, v_qty, nullif(left(coalesce(p_dietary_notes, ''), 1000), ''))
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function book_session from public, anon;
grant execute on function book_session to authenticated;
