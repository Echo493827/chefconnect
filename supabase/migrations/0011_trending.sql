-- chefconnect :: 0011_trending.sql
-- "What's trending": published classes with upcoming dates, ranked by recent
-- activity (bookings in the last 30 days) plus review signal. Returns the same
-- shape as search_classes so the browse card component is reused as-is.
--
-- SECURITY DEFINER because the popularity score counts bookings across ALL users
-- (a signal RLS would otherwise hide); it only ever returns public class fields
-- and aggregate counts, never anyone's individual booking. Depends on 0001-0010.

create or replace function trending_classes(p_limit integer default 24)
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
security definer
set search_path = public
as $$
  with base as (
    select
      c.id as class_id, c.slug as class_slug, c.title, c.summary, c.cuisine,
      c.skill_level, c.duration_minutes, c.price_cents, c.cover_image_url,
      cp.slug as chef_slug, cp.business_name as chef_name,
      s.id as next_session_id, s.starts_at as next_starts_at, s.timezone as next_timezone, s.format as next_format,
      l.city, l.neighborhood,
      case
        when s.format = 'virtual'   then s.virtual_capacity - s.virtual_booked
        when s.format = 'in_person' then s.inperson_capacity - s.inperson_booked
        else (s.inperson_capacity + s.virtual_capacity) - (s.inperson_booked + s.virtual_booked)
      end as seats_left
    from classes c
    join chef_profiles cp on cp.id = c.chef_profile_id
    join sessions s on s.class_id = c.id
    left join locations l on l.id = s.location_id
    where c.status = 'published'
      and not is_chef_suspended(c.chef_profile_id)
      and s.status = 'scheduled'
      and s.starts_at > now()
      and (case
             when s.format = 'virtual'   then s.virtual_booked  < s.virtual_capacity
             when s.format = 'in_person' then s.inperson_booked < s.inperson_capacity
             else (s.inperson_booked < s.inperson_capacity or s.virtual_booked < s.virtual_capacity)
           end)
  ),
  ranked as (
    select distinct on (class_id) * from base order by class_id, next_starts_at
  ),
  scored as (
    select
      r.*,
      (select count(*) from base b where b.class_id = r.class_id) as session_count,
      (select count(*) from bookings bk
         join sessions s2 on s2.id = bk.session_id
        where s2.class_id = r.class_id
          and bk.status in ('confirmed', 'attended')
          and bk.created_at > now() - interval '30 days') as recent_bookings,
      (select count(*) from reviews rv where rv.class_id = r.class_id) as review_count,
      coalesce((select avg(rating) from reviews rv where rv.class_id = r.class_id), 0) as review_avg
    from ranked r
  )
  select
    class_id, class_slug, title, summary, cuisine, skill_level, duration_minutes,
    price_cents, cover_image_url, chef_slug, chef_name,
    next_session_id, next_starts_at, next_timezone, next_format,
    city, neighborhood, seats_left, session_count, null::double precision as distance_km
  from scored
  order by (recent_bookings * 3 + review_count + review_avg * 0.5) desc, next_starts_at asc
  limit greatest(1, least(coalesce(p_limit, 24), 60));
$$;

grant execute on function trending_classes to anon, authenticated;
