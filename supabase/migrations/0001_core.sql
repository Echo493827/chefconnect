-- chefconnect :: 0001_core.sql
-- Identity and place: users (mirrored from Supabase Auth), chef profiles, and
-- locations split into a public half (fuzzed coordinates) and a private half
-- (exact address, released only to the chef and confirmed attendees via RLS).
-- Apply first. Row Level Security for every table lives in 0004_rls.sql.

-- ---------- enums ----------
create type user_role           as enum ('attendee', 'chef', 'admin');
create type chef_type           as enum ('home', 'restaurant', 'youtube', 'celebrity', 'cooking_school', 'other');
create type verification_status as enum ('unverified', 'pending', 'verified');

-- ---------- shared helpers ----------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------- users ----------
-- One row per auth user, created automatically by handle_new_user() below.
-- Holds only public-safe profile fields; email and credentials stay in auth.users.
create table users (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 80),
  avatar_url   text,
  bio          text check (char_length(bio) <= 1000),
  role         user_role not null default 'attendee',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger trg_users_updated_at
  before update on users
  for each row execute function set_updated_at();

-- Roles are earned, not self-assigned: 'chef' only once a chef profile exists
-- (promote_to_chef() below), 'admin' only via the service role.
create or replace function protect_user_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = old.role or auth.uid() is null then
    return new;
  end if;
  if new.role = 'chef' and exists (select 1 from chef_profiles where user_id = new.id) then
    return new;
  end if;
  raise exception 'Role cannot be changed directly' using errcode = 'insufficient_privilege';
end;
$$;

create trigger trg_protect_user_role
  before update of role on users
  for each row execute function protect_user_role();

-- Provision the public profile the moment Supabase Auth creates a user, so the
-- app never has to remember to do it and RLS (which keys off users.id) always
-- has a row to match. Runs as the function owner so it can write regardless of RLS.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New member'
    ), 80),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- chef profiles ----------
-- A user becomes a chef by creating one of these. rating_avg / rating_count are
-- maintained by triggers in 0003 so search can sort by rating without joins.
create table chef_profiles (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null unique references users(id) on delete cascade,
  slug                  text not null unique
                          check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) between 3 and 60),
  chef_type             chef_type not null,
  business_name         text check (char_length(business_name) <= 120),
  headline              text check (char_length(headline) <= 140),
  about                 text check (char_length(about) <= 4000),
  years_experience      smallint check (years_experience between 0 and 80),
  specialties           text[] not null default '{}',
  social_links          jsonb not null default '{}'::jsonb, -- {"instagram": "...", "youtube": "...", "website": "..."}
  cover_image_url       text,
  verification_status   verification_status not null default 'unverified',
  is_accepting_bookings boolean not null default true,
  rating_avg            numeric(3,2) not null default 0 check (rating_avg between 0 and 5),
  rating_count          integer not null default 0 check (rating_count >= 0),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index chef_profiles_chef_type_idx   on chef_profiles (chef_type);
create index chef_profiles_specialties_idx on chef_profiles using gin (specialties);

create trigger trg_chef_profiles_updated_at
  before update on chef_profiles
  for each row execute function set_updated_at();

-- Creating a chef profile promotes the user to the chef role.
create or replace function promote_to_chef()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update users set role = 'chef' where id = new.user_id and role = 'attendee';
  return new;
end;
$$;

create trigger trg_promote_to_chef
  after insert on chef_profiles
  for each row execute function promote_to_chef();

-- ---------- locations (public half) ----------
-- What anyone browsing can see. Coordinates here are deliberately fuzzed by
-- fuzz_location_coordinates() so a home kitchen never appears exactly on a map.
create table locations (
  id              uuid primary key default gen_random_uuid(),
  chef_profile_id uuid not null references chef_profiles(id) on delete cascade,
  label           text not null check (char_length(label) between 1 and 80), -- "My home kitchen", "Restaurant private room"
  city            text not null check (char_length(city) between 1 and 80),
  region          text check (char_length(region) <= 80),                     -- state / province
  country_code    char(2) not null default 'US',
  neighborhood    text check (char_length(neighborhood) <= 80),
  approx_lat      double precision check (approx_lat between -90 and 90),
  approx_lng      double precision check (approx_lng between -180 and 180),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index locations_chef_profile_idx on locations (chef_profile_id);
create index locations_city_idx         on locations (city);
create index locations_approx_idx       on locations (approx_lat, approx_lng);

create trigger trg_locations_updated_at
  before update on locations
  for each row execute function set_updated_at();

-- ---------- location addresses (private half) ----------
-- Exact address. RLS in 0004 restricts reads to the owning chef and to users
-- holding a live booking at this location. Keeping it in its own table means a
-- plain `select *` on locations can never leak it.
create table location_addresses (
  location_id   uuid primary key references locations(id) on delete cascade,
  full_address  text not null check (char_length(full_address) between 1 and 300),
  exact_lat     double precision not null check (exact_lat between -90 and 90),
  exact_lng     double precision not null check (exact_lng between -180 and 180),
  arrival_notes text check (char_length(arrival_notes) <= 1000), -- "buzz 3B, park on the street"
  updated_at    timestamptz not null default now()
);

-- Whenever the exact point changes, place the public point a random 300-800 m
-- away and snap it to a ~100 m grid, so the fuzz can't be reversed by averaging.
create or replace function fuzz_location_coordinates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  dist_deg double precision := (300 + random() * 500) / 111000.0; -- metres -> degrees of latitude
  angle    double precision := random() * 2 * pi();
begin
  update locations
  set approx_lat = least(90, greatest(-90,
                     round((new.exact_lat + dist_deg * sin(angle))::numeric, 3)::double precision)),
      approx_lng = least(180, greatest(-180,
                     round((new.exact_lng + dist_deg * cos(angle) / greatest(cos(radians(new.exact_lat)), 0.01))::numeric, 3)::double precision))
  where id = new.location_id;
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_fuzz_location_coordinates
  before insert or update of exact_lat, exact_lng on location_addresses
  for each row execute function fuzz_location_coordinates();

-- ---------- RPC: upsert_location ----------
-- Creates or updates a location and its private address in a single
-- transaction, so the two halves can never drift apart. Callable only by the
-- owning chef (checked here; the function bypasses RLS so it can write both tables).
create or replace function upsert_location(
  p_label         text,
  p_city          text,
  p_full_address  text,
  p_exact_lat     double precision,
  p_exact_lng     double precision,
  p_location_id   uuid default null, -- null creates, otherwise updates
  p_region        text default null,
  p_country_code  text default 'US',
  p_neighborhood  text default null,
  p_arrival_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chef uuid;
  v_id   uuid;
begin
  select id into v_chef from chef_profiles where user_id = auth.uid();
  if v_chef is null then
    raise exception 'Only chefs can manage locations' using errcode = 'insufficient_privilege';
  end if;

  if p_location_id is null then
    insert into locations (chef_profile_id, label, city, region, country_code, neighborhood)
    values (v_chef, p_label, p_city, p_region, p_country_code, p_neighborhood)
    returning id into v_id;
  else
    update locations
       set label = p_label, city = p_city, region = p_region,
           country_code = p_country_code, neighborhood = p_neighborhood
     where id = p_location_id and chef_profile_id = v_chef
    returning id into v_id;
    if v_id is null then
      raise exception 'Location not found' using errcode = 'no_data_found';
    end if;
  end if;

  insert into location_addresses (location_id, full_address, exact_lat, exact_lng, arrival_notes)
  values (v_id, p_full_address, p_exact_lat, p_exact_lng, p_arrival_notes)
  on conflict (location_id) do update
    set full_address  = excluded.full_address,
        exact_lat     = excluded.exact_lat,
        exact_lng     = excluded.exact_lng,
        arrival_notes = excluded.arrival_notes;

  return v_id;
end;
$$;

revoke execute on function upsert_location from public, anon;
grant  execute on function upsert_location to authenticated;
