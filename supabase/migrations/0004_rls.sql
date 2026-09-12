-- chefconnect :: 0004_rls.sql
-- Row Level Security for every table, plus the grants the Supabase API roles
-- need. Depends on 0001-0003. Rules of thumb encoded here:
--   * anyone (signed in or not) can browse published classes, sessions,
--     chef profiles, reviews and fuzzed locations
--   * exact addresses and virtual join links are visible only to the chef
--     and to attendees with a live booking
--   * every write is scoped to the row's owner; multi-table writes go
--     through the RPCs defined in 0001/0002
--   * notifications are written only by triggers / the service role

-- ---------- helpers ----------
-- security definer + fixed search_path so policies stay fast and can't recurse.
create or replace function current_chef_profile_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from chef_profiles where user_id = auth.uid()
$$;

create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from users where id = auth.uid() and role = 'admin')
$$;

create or replace function is_chef_of_class(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from classes c join chef_profiles cp on cp.id = c.chef_profile_id
     where c.id = p_class_id and cp.user_id = auth.uid()
  )
$$;

create or replace function is_chef_of_session(p_session_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from sessions s
      join classes c on c.id = s.class_id
      join chef_profiles cp on cp.id = c.chef_profile_id
     where s.id = p_session_id and cp.user_id = auth.uid()
  )
$$;

create or replace function has_live_booking(p_session_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bookings
     where session_id = p_session_id and user_id = auth.uid()
       and status in ('confirmed', 'attended')
  )
$$;

create or replace function has_live_booking_at_location(p_location_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from bookings b join sessions s on s.id = b.session_id
     where s.location_id = p_location_id and b.user_id = auth.uid()
       and b.status in ('confirmed', 'attended')
  )
$$;

create or replace function is_class_published(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = p_class_id and status = 'published')
$$;

-- ---------- users ----------
alter table users enable row level security;

create policy "users: public read"   on users for select using (true);
create policy "users: insert self"   on users for insert with check (id = auth.uid());
create policy "users: update self"   on users for update using (id = auth.uid()) with check (id = auth.uid()); -- role changes blocked by protect_user_role()

-- ---------- chef_profiles ----------
alter table chef_profiles enable row level security;

create policy "chef_profiles: public read" on chef_profiles for select using (true);
create policy "chef_profiles: insert own"  on chef_profiles for insert with check (user_id = auth.uid());
create policy "chef_profiles: update own"  on chef_profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "chef_profiles: delete own"  on chef_profiles for delete using (user_id = auth.uid());

-- ---------- locations (public half) ----------
alter table locations enable row level security;

create policy "locations: public read" on locations for select using (is_active or chef_profile_id = current_chef_profile_id());
create policy "locations: insert own"  on locations for insert with check (chef_profile_id = current_chef_profile_id());
create policy "locations: update own"  on locations for update using (chef_profile_id = current_chef_profile_id()) with check (chef_profile_id = current_chef_profile_id());
create policy "locations: delete own"  on locations for delete using (chef_profile_id = current_chef_profile_id());

-- ---------- location_addresses (private half) ----------
-- Reads: the owning chef, or an attendee with a live booking at this location.
-- Writes only through upsert_location(), which checks ownership itself.
alter table location_addresses enable row level security;

create policy "location_addresses: chef or booked attendee read" on location_addresses for select using (
  exists (select 1 from locations l where l.id = location_id and l.chef_profile_id = current_chef_profile_id())
  or has_live_booking_at_location(location_id)
);

-- ---------- classes ----------
alter table classes enable row level security;

create policy "classes: published or own read" on classes for select using (
  status = 'published' or chef_profile_id = current_chef_profile_id() or is_admin()
);
create policy "classes: insert own" on classes for insert with check (chef_profile_id = current_chef_profile_id());
create policy "classes: update own" on classes for update using (chef_profile_id = current_chef_profile_id()) with check (chef_profile_id = current_chef_profile_id());
create policy "classes: delete own" on classes for delete using (chef_profile_id = current_chef_profile_id());

-- ---------- sessions ----------
alter table sessions enable row level security;

create policy "sessions: visible with class" on sessions for select using (
  is_class_published(class_id) or is_chef_of_class(class_id) or is_admin()
);
create policy "sessions: insert own" on sessions for insert with check (is_chef_of_class(class_id));
create policy "sessions: update own" on sessions for update using (is_chef_of_class(class_id)) with check (is_chef_of_class(class_id));
create policy "sessions: delete own" on sessions for delete using (is_chef_of_class(class_id));

-- ---------- session_secrets ----------
alter table session_secrets enable row level security;

create policy "session_secrets: chef or booked attendee read" on session_secrets for select using (
  is_chef_of_session(session_id) or has_live_booking(session_id)
);
create policy "session_secrets: insert own" on session_secrets for insert with check (is_chef_of_session(session_id));
create policy "session_secrets: update own" on session_secrets for update using (is_chef_of_session(session_id)) with check (is_chef_of_session(session_id));
create policy "session_secrets: delete own" on session_secrets for delete using (is_chef_of_session(session_id));

-- ---------- waivers ----------
-- Readable by everyone (the booking flow shows the current text); written only
-- by the service role (no insert/update policies).
alter table waivers enable row level security;

create policy "waivers: public read" on waivers for select using (true);

-- ---------- waiver_acceptances ----------
-- Normally written by book_session(); direct inserts are still limited to self.
alter table waiver_acceptances enable row level security;

create policy "waiver_acceptances: read own or as chef" on waiver_acceptances for select using (
  user_id = auth.uid() or is_chef_of_session(session_id)
);
create policy "waiver_acceptances: insert self" on waiver_acceptances for insert with check (user_id = auth.uid());

-- ---------- bookings ----------
-- Inserts go through book_session(); direct inserts are limited to self and
-- still pass every trigger check. Updates are governed by validate_booking_update().
alter table bookings enable row level security;

create policy "bookings: read own or as chef" on bookings for select using (
  user_id = auth.uid() or is_chef_of_session(session_id)
);
create policy "bookings: insert self"  on bookings for insert with check (user_id = auth.uid() and status = 'confirmed');
create policy "bookings: update own or as chef" on bookings for update
  using (user_id = auth.uid() or is_chef_of_session(session_id))
  with check (user_id = auth.uid() or is_chef_of_session(session_id));

-- ---------- reviews ----------
alter table reviews enable row level security;

create policy "reviews: public read"  on reviews for select using (true);
create policy "reviews: insert self"  on reviews for insert with check (user_id = auth.uid());
create policy "reviews: update author or chef" on reviews for update
  using (user_id = auth.uid() or chef_profile_id = current_chef_profile_id())
  with check (user_id = auth.uid() or chef_profile_id = current_chef_profile_id());
create policy "reviews: delete own"   on reviews for delete using (user_id = auth.uid());

-- ---------- recaps ----------
alter table recaps enable row level security;

create policy "recaps: chef or attendee read" on recaps for select using (
  chef_profile_id = current_chef_profile_id()
  or (published_at is not null and has_live_booking(session_id))
);
create policy "recaps: insert own" on recaps for insert with check (chef_profile_id = current_chef_profile_id());
create policy "recaps: update own" on recaps for update using (chef_profile_id = current_chef_profile_id()) with check (chef_profile_id = current_chef_profile_id());
create policy "recaps: delete own" on recaps for delete using (chef_profile_id = current_chef_profile_id());

-- ---------- saved_classes ----------
alter table saved_classes enable row level security;

create policy "saved_classes: own" on saved_classes for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- reports ----------
alter table reports enable row level security;

create policy "reports: read own or admin" on reports for select using (reporter_id = auth.uid() or is_admin());
create policy "reports: insert self"       on reports for insert with check (reporter_id = auth.uid());
create policy "reports: admin update"      on reports for update using (is_admin()) with check (is_admin());

-- ---------- notifications ----------
-- No insert policy: only triggers and the service role can create them.
alter table notifications enable row level security;

create policy "notifications: read own"   on notifications for select using (user_id = auth.uid());
create policy "notifications: update own" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notifications: delete own" on notifications for delete using (user_id = auth.uid());

-- ---------- grants ----------
-- Supabase applies default grants to new tables, but spelling them out keeps
-- the intent visible and makes the migrations portable to plain Postgres.
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant execute on all functions in schema public to service_role;
grant execute on function
  current_chef_profile_id, is_admin, is_chef_of_class, is_chef_of_session,
  has_live_booking, has_live_booking_at_location, is_class_published
to anon, authenticated;
