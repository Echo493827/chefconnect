-- chefconnect :: 0002_classes_bookings.sql
-- The class/session split, versioned liability waivers, and bookings with
-- capacity enforced atomically at the database. Depends on 0001_core.sql.

-- ---------- enums ----------
create type class_status   as enum ('draft', 'published', 'archived');
create type skill_level    as enum ('beginner', 'intermediate', 'advanced', 'all_levels');
create type session_format as enum ('in_person', 'virtual', 'hybrid');
create type seat_type      as enum ('in_person', 'virtual');
create type session_status as enum ('scheduled', 'cancelled', 'completed');
create type booking_status as enum ('confirmed', 'cancelled', 'attended', 'no_show');

-- array_to_string is only STABLE, so it can't feed a generated column directly.
-- Joining text[] with a space is deterministic, so an immutable wrapper is safe.
create or replace function array_to_search_text(p_items text[])
returns text language sql immutable parallel safe as $$
  select array_to_string(p_items, ' ')
$$;

-- ---------- classes (reusable templates) ----------
create table classes (
  id               uuid primary key default gen_random_uuid(),
  chef_profile_id  uuid not null references chef_profiles(id) on delete cascade,
  slug             text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 80),
  title            text not null check (char_length(title) between 3 and 120),
  summary          text check (char_length(summary) <= 280),      -- card-length blurb
  description      text check (char_length(description) <= 8000),
  cuisine          text not null check (char_length(cuisine) between 1 and 60), -- "Pakistani", "French pastry"
  skill_level      skill_level not null default 'all_levels',
  tags             text[] not null default '{}',                   -- "knife skills", "date night"
  dietary_tags     text[] not null default '{}',                   -- "halal", "vegetarian", "gluten-free"
  duration_minutes integer not null check (duration_minutes between 15 and 720),
  price_cents      integer not null default 0 check (price_cents >= 0), -- free MVP; ready for payments
  currency         char(3) not null default 'USD',
  cover_image_url  text,
  gallery_urls     text[] not null default '{}',
  what_you_learn   text[] not null default '{}',
  what_to_bring    text[] not null default '{}',
  status           class_status not null default 'draft',
  search_vector    tsvector generated always as (
                     setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                     setweight(to_tsvector('english', coalesce(cuisine, '')), 'A') ||
                     setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
                     setweight(to_tsvector('english', array_to_search_text(tags)), 'B') ||
                     setweight(to_tsvector('english', array_to_search_text(dietary_tags)), 'B') ||
                     setweight(to_tsvector('english', coalesce(description, '')), 'C')
                   ) stored,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (chef_profile_id, slug)
);

create index classes_chef_profile_idx on classes (chef_profile_id);
create index classes_status_idx       on classes (status);
create index classes_cuisine_idx      on classes (lower(cuisine));
create index classes_tags_idx         on classes using gin (tags);
create index classes_dietary_tags_idx on classes using gin (dietary_tags);
create index classes_search_idx       on classes using gin (search_vector);

create trigger trg_classes_updated_at
  before update on classes
  for each row execute function set_updated_at();

-- ---------- sessions (scheduled instances) ----------
-- inperson_booked / virtual_booked are maintained by the booking triggers below
-- and are the source of truth for "seats left", readable by anyone.
create table sessions (
  id                        uuid primary key default gen_random_uuid(),
  class_id                  uuid not null references classes(id) on delete cascade,
  location_id               uuid references locations(id) on delete restrict,
  format                    session_format not null,
  starts_at                 timestamptz not null,
  ends_at                   timestamptz not null,
  timezone                  text not null default 'America/Chicago',
  inperson_capacity         integer not null default 0 check (inperson_capacity between 0 and 500),
  virtual_capacity          integer not null default 0 check (virtual_capacity between 0 and 5000),
  inperson_booked           integer not null default 0 check (inperson_booked >= 0),
  virtual_booked            integer not null default 0 check (virtual_booked >= 0),
  cancellation_cutoff_hours integer not null default 24 check (cancellation_cutoff_hours between 0 and 720),
  status                    session_status not null default 'scheduled',
  cancelled_at              timestamptz,
  cancellation_reason       text check (char_length(cancellation_reason) <= 500),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint session_time_order check (ends_at > starts_at),
  constraint session_capacity_matches_format check (
       (format = 'in_person' and inperson_capacity > 0 and virtual_capacity = 0)
    or (format = 'virtual'   and virtual_capacity  > 0 and inperson_capacity = 0)
    or (format = 'hybrid'    and inperson_capacity > 0 and virtual_capacity  > 0)
  ),
  constraint session_location_matches_format check (
       (format = 'virtual' and location_id is null)
    or (format <> 'virtual' and location_id is not null)
  ),
  -- also stops a chef from shrinking capacity below what is already booked
  constraint session_booked_within_capacity check (
    inperson_booked <= inperson_capacity and virtual_booked <= virtual_capacity
  )
);

create index sessions_class_idx     on sessions (class_id);
create index sessions_location_idx  on sessions (location_id);
create index sessions_upcoming_idx  on sessions (starts_at) where status = 'scheduled';

create trigger trg_sessions_updated_at
  before update on sessions
  for each row execute function set_updated_at();

-- A session's location must belong to the same chef as its class, the class
-- can never be swapped after creation, and cancelling stamps cancelled_at.
create or replace function validate_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_class_chef    uuid;
  v_location_chef uuid;
begin
  if tg_op = 'UPDATE' and new.class_id <> old.class_id then
    raise exception 'A session cannot be moved to a different class' using errcode = 'check_violation';
  end if;

  if new.location_id is not null then
    select chef_profile_id into v_class_chef    from classes   where id = new.class_id;
    select chef_profile_id into v_location_chef from locations where id = new.location_id;
    if v_class_chef is distinct from v_location_chef then
      raise exception 'Location must belong to the chef who owns the class' using errcode = 'check_violation';
    end if;
  end if;

  if new.status = 'cancelled' and (tg_op = 'INSERT' or old.status <> 'cancelled') then
    new.cancelled_at = coalesce(new.cancelled_at, now());
  end if;

  return new;
end;
$$;

create trigger trg_validate_session
  before insert or update on sessions
  for each row execute function validate_session();

-- ---------- session_secrets (private half of a session) ----------
-- The virtual join link and any attendee-only notes. RLS in 0004 limits reads
-- to the chef and to attendees holding a live booking.
create table session_secrets (
  session_id       uuid primary key references sessions(id) on delete cascade,
  virtual_join_url text check (char_length(virtual_join_url) <= 500),
  attendee_notes   text check (char_length(attendee_notes) <= 2000),
  updated_at       timestamptz not null default now()
);

create trigger trg_session_secrets_updated_at
  before update on session_secrets
  for each row execute function set_updated_at();

-- ---------- waivers (versioned legal text) ----------
-- Exactly one version is current. Acceptances reference the version, so the
-- record shows the exact text each person agreed to.
create table waivers (
  version        text primary key check (char_length(version) between 1 and 40),
  title          text not null check (char_length(title) between 1 and 120),
  body           text not null,
  is_current     boolean not null default false,
  effective_from timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

create unique index waivers_one_current_idx on waivers (is_current) where is_current;

-- Placeholder so the booking flow works in development. Replace the body with
-- reviewed legal text (as a NEW version) before soft launch.
insert into waivers (version, title, body, is_current) values (
  '2026-09-v1',
  'Participation waiver',
  'PLACEHOLDER: replace with reviewed legal text before launch. By booking you acknowledge that cooking involves heat, sharp tools and potential allergens, and you participate at your own risk.',
  true
);

create table waiver_acceptances (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users(id) on delete cascade,
  session_id     uuid not null references sessions(id) on delete cascade,
  waiver_version text not null references waivers(version),
  accepted_at    timestamptz not null default now(),
  ip_address     inet,
  user_agent     text check (char_length(user_agent) <= 500)
);

create index waiver_acceptances_user_session_idx on waiver_acceptances (user_id, session_id);

-- ---------- bookings ----------
-- waiver_acceptance_id is NOT NULL: a booking cannot exist without its waiver
-- record. book_session() below writes both in one transaction.
create table bookings (
  id                   uuid primary key default gen_random_uuid(),
  session_id           uuid not null references sessions(id) on delete cascade,
  user_id              uuid not null references users(id) on delete cascade,
  seat_type            seat_type not null,
  status               booking_status not null default 'confirmed',
  waiver_acceptance_id uuid not null references waiver_acceptances(id),
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- One live booking per user per session; a cancelled booking does not block rebooking.
create unique index bookings_one_live_per_user_idx on bookings (session_id, user_id)
  where status <> 'cancelled';
create index bookings_session_idx on bookings (session_id, status);
create index bookings_user_idx    on bookings (user_id);

create trigger trg_bookings_updated_at
  before update on bookings
  for each row execute function set_updated_at();

-- Claims one seat with a single conditional UPDATE. Postgres row-locks the
-- session row, so two concurrent bookings serialise and the second re-checks
-- the incremented count: no overbooking, no explicit lock needed.
create or replace function claim_seat(p_session_id uuid, p_seat seat_type)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_rows integer;
begin
  if p_seat = 'in_person' then
    update sessions set inperson_booked = inperson_booked + 1
     where id = p_session_id and inperson_booked < inperson_capacity;
  else
    update sessions set virtual_booked = virtual_booked + 1
     where id = p_session_id and virtual_booked < virtual_capacity;
  end if;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Session is full for % seats', p_seat using errcode = 'check_violation';
  end if;
end;
$$;

create or replace function release_seat(p_session_id uuid, p_seat seat_type)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_seat = 'in_person' then
    update sessions set inperson_booked = greatest(inperson_booked - 1, 0) where id = p_session_id;
  else
    update sessions set virtual_booked = greatest(virtual_booked - 1, 0) where id = p_session_id;
  end if;
end;
$$;

-- Validates a new booking and claims its seat.
create or replace function validate_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    perform claim_seat(new.session_id, new.seat_type);
  end if;
  return new;
end;
$$;

create trigger trg_validate_booking_insert
  before insert on bookings
  for each row execute function validate_booking_insert();

-- Governs status changes. When auth.uid() is null (service role / server-side
-- admin) anything goes; otherwise the attendee may only cancel before the
-- cutoff, and the chef may mark attended / no_show / cancelled at any time.
create or replace function validate_booking_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session   sessions%rowtype;
  v_chef_user uuid;
  v_actor     uuid := auth.uid();
  v_was_live  boolean := old.status in ('confirmed', 'attended');
  v_is_live   boolean := new.status in ('confirmed', 'attended');
begin
  if new.session_id <> old.session_id or new.user_id <> old.user_id
     or new.seat_type <> old.seat_type or new.waiver_acceptance_id <> old.waiver_acceptance_id then
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
    perform release_seat(new.session_id, new.seat_type);
  elsif not v_was_live and v_is_live then
    perform claim_seat(new.session_id, new.seat_type);
  end if;
  return new;
end;
$$;

create trigger trg_validate_booking_update
  before update on bookings
  for each row execute function validate_booking_update();

-- ---------- RPC: book_session ----------
-- The one call the app makes to book: records the waiver acceptance and the
-- booking in a single transaction, so neither can exist without the other.
create or replace function book_session(
  p_session_id     uuid,
  p_seat_type      seat_type,
  p_waiver_version text,
  p_ip_address     inet default null,
  p_user_agent     text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
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

  insert into bookings (session_id, user_id, seat_type, waiver_acceptance_id)
  values (p_session_id, v_user, p_seat_type, v_waiver)
  returning id into v_id;

  return v_id;
end;
$$;

-- ---------- RPC: cancel_booking ----------
-- Works for the attendee (subject to the cutoff) and for the chef.
-- All rules are enforced by validate_booking_update().
create or replace function cancel_booking(p_booking_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_rows integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in to cancel a booking' using errcode = 'insufficient_privilege';
  end if;
  update bookings set status = 'cancelled'
   where id = p_booking_id and status <> 'cancelled';
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Booking not found or already cancelled' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke execute on function claim_seat, release_seat from public, anon, authenticated;
revoke execute on function book_session, cancel_booking from public, anon;
grant  execute on function book_session, cancel_booking to authenticated;
