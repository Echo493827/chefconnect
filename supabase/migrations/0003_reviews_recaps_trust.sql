-- chefconnect :: 0003_reviews_recaps_trust.sql
-- Trust layer: reviews gated to real attendance, post-class recaps, saved
-- classes, a moderation report queue, notifications, and the cascade that
-- cancels bookings and notifies attendees when a chef cancels a session.
-- Depends on 0001_core.sql and 0002_classes_bookings.sql.

-- ---------- reviews ----------
-- One review per booking. The trigger fills session/class/chef from the
-- booking so they can never disagree with it, and refuses anything that
-- isn't a real, completed attendance.
create table reviews (
  id                uuid primary key default gen_random_uuid(),
  booking_id        uuid not null unique references bookings(id) on delete cascade,
  session_id        uuid not null references sessions(id) on delete cascade,
  class_id          uuid not null references classes(id) on delete cascade,
  chef_profile_id   uuid not null references chef_profiles(id) on delete cascade,
  user_id           uuid not null references users(id) on delete cascade,
  rating            smallint not null check (rating between 1 and 5),
  body              text check (char_length(body) <= 3000),
  chef_response     text check (char_length(chef_response) <= 2000),
  chef_responded_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index reviews_chef_profile_idx on reviews (chef_profile_id, created_at desc);
create index reviews_class_idx        on reviews (class_id, created_at desc);
create index reviews_user_idx         on reviews (user_id);

create trigger trg_reviews_updated_at
  before update on reviews
  for each row execute function set_updated_at();

create or replace function enforce_review_eligibility()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
  v_session sessions%rowtype;
begin
  select * into v_booking from bookings where id = new.booking_id;
  if v_booking.id is null then
    raise exception 'Booking not found' using errcode = 'no_data_found';
  end if;
  if v_booking.user_id <> new.user_id or (auth.uid() is not null and auth.uid() <> new.user_id) then
    raise exception 'You can only review your own bookings' using errcode = 'insufficient_privilege';
  end if;
  if v_booking.status not in ('confirmed', 'attended') then
    raise exception 'Only attended bookings can be reviewed' using errcode = 'check_violation';
  end if;

  select * into v_session from sessions where id = v_booking.session_id;
  if v_session.status = 'cancelled' then
    raise exception 'Cancelled sessions cannot be reviewed' using errcode = 'check_violation';
  end if;
  if v_session.ends_at > now() then
    raise exception 'Reviews open once the session has ended' using errcode = 'check_violation';
  end if;

  new.session_id      = v_session.id;
  new.class_id        = v_session.class_id;
  select chef_profile_id into new.chef_profile_id from classes where id = v_session.class_id;
  new.chef_response     = null;
  new.chef_responded_at = null;
  return new;
end;
$$;

create trigger trg_enforce_review_eligibility
  before insert on reviews
  for each row execute function enforce_review_eligibility();

-- The author may edit rating/body; the chef may only write a response.
create or replace function restrict_review_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor     uuid := auth.uid();
  v_chef_user uuid;
begin
  if new.booking_id <> old.booking_id or new.session_id <> old.session_id or new.class_id <> old.class_id
     or new.chef_profile_id <> old.chef_profile_id or new.user_id <> old.user_id then
    raise exception 'Review identity fields cannot change' using errcode = 'check_violation';
  end if;
  if v_actor is null then
    return new;
  end if;

  select user_id into v_chef_user from chef_profiles where id = old.chef_profile_id;

  if v_actor = old.user_id then
    if new.chef_response is distinct from old.chef_response then
      raise exception 'Only the chef can write a response' using errcode = 'insufficient_privilege';
    end if;
    new.chef_responded_at = old.chef_responded_at;
  elsif v_actor = v_chef_user then
    if new.rating <> old.rating or new.body is distinct from old.body then
      raise exception 'Chefs cannot edit a review, only respond to it' using errcode = 'insufficient_privilege';
    end if;
    if new.chef_response is distinct from old.chef_response then
      new.chef_responded_at = now();
    end if;
  else
    raise exception 'Not allowed to change this review' using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger trg_restrict_review_update
  before update on reviews
  for each row execute function restrict_review_update();

-- Keep chef_profiles.rating_avg / rating_count current. A full recompute per
-- change is cheap at this scale and immune to drift.
create or replace function refresh_chef_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_chef uuid := coalesce(new.chef_profile_id, old.chef_profile_id);
begin
  update chef_profiles cp
     set rating_avg   = coalesce((select round(avg(rating)::numeric, 2) from reviews where chef_profile_id = v_chef), 0),
         rating_count = (select count(*) from reviews where chef_profile_id = v_chef)
   where cp.id = v_chef;
  return null;
end;
$$;

create trigger trg_refresh_chef_rating
  after insert or update of rating or delete on reviews
  for each row execute function refresh_chef_rating();

-- ---------- recaps ----------
-- One recap per session, written by the chef, visible to attendees (RLS in 0004).
create table recaps (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null unique references sessions(id) on delete cascade,
  chef_profile_id uuid not null references chef_profiles(id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 120),
  body            text check (char_length(body) <= 20000),
  photo_urls      text[] not null default '{}',
  attachments     jsonb not null default '[]'::jsonb, -- [{"label": "Recipe PDF", "url": "..."}]
  published_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index recaps_chef_profile_idx on recaps (chef_profile_id);

create trigger trg_recaps_updated_at
  before update on recaps
  for each row execute function set_updated_at();

create or replace function validate_recap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_chef uuid;
begin
  select c.chef_profile_id into v_chef
    from sessions s join classes c on c.id = s.class_id
   where s.id = new.session_id;
  if v_chef is null or v_chef <> new.chef_profile_id then
    raise exception 'Recap chef must own the session' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_validate_recap
  before insert or update on recaps
  for each row execute function validate_recap();

-- ---------- saved classes ----------
create table saved_classes (
  user_id    uuid not null references users(id) on delete cascade,
  class_id   uuid not null references classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, class_id)
);

create index saved_classes_class_idx on saved_classes (class_id);

-- ---------- moderation reports ----------
create type report_target as enum ('class', 'session', 'chef_profile', 'review', 'recap', 'user');
create type report_status as enum ('open', 'reviewed', 'dismissed', 'actioned');

create table reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references users(id) on delete cascade,
  target_type report_target not null,
  target_id   uuid not null,
  reason      text not null check (char_length(reason) between 1 and 80),   -- "misleading", "unsafe", "harassment"
  details     text check (char_length(details) <= 2000),
  status      report_status not null default 'open',
  resolved_by uuid references users(id),
  resolved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index reports_open_idx   on reports (created_at) where status = 'open';
create index reports_target_idx on reports (target_type, target_id);

-- ---------- notifications ----------
-- Written only by triggers and server-side code; users read and mark their own.
create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  kind       text not null check (char_length(kind) between 1 and 60), -- "booking_confirmed", "session_cancelled"
  title      text not null check (char_length(title) between 1 and 140),
  body       text check (char_length(body) <= 1000),
  data       jsonb not null default '{}'::jsonb,                        -- ids for deep-linking
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_unread_idx on notifications (user_id) where read_at is null;

-- ---------- cascades ----------
-- A chef cancelling a session cancels every live booking and notifies each attendee.
create or replace function handle_session_cancelled()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_title text;
begin
  if new.status <> 'cancelled' or old.status = 'cancelled' then
    return null;
  end if;

  select title into v_title from classes where id = new.class_id;

  insert into notifications (user_id, kind, title, body, data)
  select b.user_id,
         'session_cancelled',
         'Class cancelled: ' || v_title,
         coalesce('The chef cancelled this session. ' || new.cancellation_reason, 'The chef cancelled this session.'),
         jsonb_build_object('session_id', new.id, 'class_id', new.class_id, 'booking_id', b.id)
    from bookings b
   where b.session_id = new.id and b.status in ('confirmed', 'attended');

  update bookings set status = 'cancelled'
   where session_id = new.id and status in ('confirmed', 'attended');
  return null;
end;
$$;

create trigger trg_handle_session_cancelled
  after update of status on sessions
  for each row execute function handle_session_cancelled();

-- Tell the chef when a seat is booked or released by an attendee.
create or replace function notify_chef_of_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chef_user uuid;
  v_title     text;
  v_name      text;
  v_session   sessions%rowtype;
begin
  select * into v_session from sessions where id = new.session_id;
  if v_session.status = 'cancelled' then
    return null; -- the session cascade already handled this
  end if;

  select cp.user_id, c.title into v_chef_user, v_title
    from classes c join chef_profiles cp on cp.id = c.chef_profile_id
   where c.id = v_session.class_id;
  select display_name into v_name from users where id = new.user_id;

  if tg_op = 'INSERT' and new.status = 'confirmed' then
    insert into notifications (user_id, kind, title, body, data)
    values (v_chef_user, 'booking_confirmed', 'New booking: ' || v_title,
            v_name || ' booked a ' || replace(new.seat_type::text, '_', '-') || ' seat.',
            jsonb_build_object('session_id', new.session_id, 'booking_id', new.id));
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status <> 'cancelled' and auth.uid() = new.user_id then
    insert into notifications (user_id, kind, title, body, data)
    values (v_chef_user, 'booking_cancelled', 'Booking cancelled: ' || v_title,
            v_name || ' cancelled their seat.',
            jsonb_build_object('session_id', new.session_id, 'booking_id', new.id));
  end if;
  return null;
end;
$$;

create trigger trg_notify_chef_of_booking
  after insert or update of status on bookings
  for each row execute function notify_chef_of_booking();
