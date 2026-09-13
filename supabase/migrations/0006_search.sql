-- chefconnect :: 0006_search.sql
-- The discovery query behind the browse/search page. One class per result, each
-- carrying its soonest upcoming session that matches every active filter, so
-- "pizza, near Rome, on these dates, with seats left" returns exactly the
-- bookable options. Depends on 0001-0005.
--
-- SECURITY INVOKER (the default): the function reads the tables as the calling
-- role, so Row Level Security is what keeps drafts and suspended chefs out of
-- results — we don't re-implement visibility here, only the search filters.

create or replace function search_classes(
  p_query           text default null,               -- keyword / cuisine (full-text)
  p_lat             double precision default null,    -- geocoded search centre
  p_lng             double precision default null,
  p_radius_km       double precision default 40,      -- how far from the centre to look
  p_date_from       timestamptz default null,         -- earliest session start
  p_date_to         timestamptz default null,         -- latest session start
  p_format          session_format default null,      -- restrict to in_person / virtual / hybrid
  p_dietary         text[] default null,              -- class must carry all of these dietary tags
  p_max_price_cents integer default null,             -- e.g. 0 for free only
  p_skill           skill_level default null,
  p_limit           integer default 60
)
returns table (
  class_id         uuid,
  class_slug       text,
  title            text,
  summary          text,
  cuisine          text,
  skill_level      skill_level,
  duration_minutes integer,
  price_cents      integer,
  cover_image_url  text,
  chef_slug        text,
  chef_name        text,
  next_session_id  uuid,
  next_starts_at   timestamptz,
  next_timezone    text,
  next_format      session_format,
  city             text,
  neighborhood     text,
  seats_left       integer,
  session_count    bigint,
  distance_km      double precision
)
language sql
stable
as $$
  with base as (
    select
      c.id            as class_id,
      c.slug          as class_slug,
      c.title,
      c.summary,
      c.cuisine,
      c.skill_level,
      c.duration_minutes,
      c.price_cents,
      c.cover_image_url,
      cp.slug         as chef_slug,
      cp.business_name as chef_name,
      s.id            as next_session_id,
      s.starts_at     as next_starts_at,
      s.timezone      as next_timezone,
      s.format        as next_format,
      l.city,
      l.neighborhood,
      case
        when s.format = 'virtual'   then s.virtual_capacity - s.virtual_booked
        when s.format = 'in_person' then s.inperson_capacity - s.inperson_booked
        else (s.inperson_capacity + s.virtual_capacity) - (s.inperson_booked + s.virtual_booked)
      end as seats_left,
      case
        when p_lat is not null and p_lng is not null and l.approx_lat is not null and l.approx_lng is not null
        then 6371 * acos(least(1, greatest(-1,
               cos(radians(p_lat)) * cos(radians(l.approx_lat)) * cos(radians(l.approx_lng) - radians(p_lng))
               + sin(radians(p_lat)) * sin(radians(l.approx_lat))
             )))
        else null
      end as distance_km
    from classes c
    join chef_profiles cp on cp.id = c.chef_profile_id
    join sessions s on s.class_id = c.id
    left join locations l on l.id = s.location_id
    where c.status = 'published'
      and s.status = 'scheduled'
      and s.starts_at > now()
      and (p_date_from is null or s.starts_at >= p_date_from)
      and (p_date_to   is null or s.starts_at <= p_date_to)
      and (p_format is null
           or s.format = p_format
           or (p_format = 'in_person' and s.format = 'hybrid')
           or (p_format = 'virtual'   and s.format = 'hybrid'))
      and (p_skill     is null or c.skill_level = p_skill)
      and (p_max_price_cents is null or c.price_cents <= p_max_price_cents)
      and (p_dietary   is null or c.dietary_tags @> p_dietary)
      and (p_query is null or btrim(p_query) = '' or c.search_vector @@ websearch_to_tsquery('english', p_query))
      and (case
             when s.format = 'virtual'   then s.virtual_booked  < s.virtual_capacity
             when s.format = 'in_person' then s.inperson_booked < s.inperson_capacity
             else (s.inperson_booked < s.inperson_capacity or s.virtual_booked < s.virtual_capacity)
           end)
  ),
  filtered as (
    -- apply the radius once distances are computed; a location search restricts
    -- to in-person/hybrid sessions actually near the centre
    select * from base
    where p_lat is null or (distance_km is not null and distance_km <= p_radius_km)
  ),
  ranked as (
    -- soonest matching session per class
    select distinct on (class_id) *
    from filtered
    order by class_id, next_starts_at
  ),
  counts as (
    select class_id, count(*) as session_count
    from filtered
    group by class_id
  )
  select
    r.class_id, r.class_slug, r.title, r.summary, r.cuisine, r.skill_level, r.duration_minutes,
    r.price_cents, r.cover_image_url, r.chef_slug, r.chef_name,
    r.next_session_id, r.next_starts_at, r.next_timezone, r.next_format,
    r.city, r.neighborhood, r.seats_left, cnts.session_count, r.distance_km
  from ranked r
  join counts cnts using (class_id)
  order by r.next_starts_at asc
  limit greatest(1, least(coalesce(p_limit, 60), 100));
$$;

grant execute on function search_classes to anon, authenticated;
