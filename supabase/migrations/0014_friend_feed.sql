-- chefconnect :: 0014_friend_feed.sql
-- Stage 2 of the social layer: the friends activity feed. Returns, for the
-- caller's accepted friends, what they're going to (upcoming bookings) and what
-- they're hosting (published classes with upcoming dates), newest first.
--
-- SECURITY DEFINER because it reads friends' bookings (normally private) — but
-- ONLY for accepted friends, and it returns just public class/session info plus
-- "who", never an address, join link, or anything sensitive. Depends on 0001-0013.

create or replace function friend_activity(p_limit integer default 30)
returns table (
  kind              text,      -- 'booked' | 'hosting'
  actor_id          uuid,
  actor_name        text,
  class_slug        text,
  class_title       text,
  cuisine           text,
  cover_image_url   text,
  chef_slug         text,
  session_starts_at timestamptz,
  session_timezone  text,
  activity_at       timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as friend_id
    from friendships
    where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  ),
  booked as (
    select
      'booked'::text as kind,
      b.user_id as actor_id, u.display_name as actor_name,
      c.slug as class_slug, c.title as class_title, c.cuisine, c.cover_image_url,
      cp.slug as chef_slug, s.starts_at as session_starts_at, s.timezone as session_timezone,
      b.created_at as activity_at
    from bookings b
    join friends f on f.friend_id = b.user_id
    join users u on u.id = b.user_id
    join sessions s on s.id = b.session_id
    join classes c on c.id = s.class_id
    join chef_profiles cp on cp.id = c.chef_profile_id
    where b.status = 'confirmed'
      and s.status = 'scheduled' and s.starts_at > now()
      and c.status = 'published' and not is_chef_suspended(c.chef_profile_id)
  ),
  hosting as (
    select distinct on (c.id)
      'hosting'::text as kind,
      cp.user_id as actor_id, u.display_name as actor_name,
      c.slug as class_slug, c.title as class_title, c.cuisine, c.cover_image_url,
      cp.slug as chef_slug, s.starts_at as session_starts_at, s.timezone as session_timezone,
      greatest(c.created_at, s.created_at) as activity_at
    from classes c
    join chef_profiles cp on cp.id = c.chef_profile_id
    join friends f on f.friend_id = cp.user_id
    join users u on u.id = cp.user_id
    join sessions s on s.class_id = c.id
    where c.status = 'published' and not is_chef_suspended(c.chef_profile_id)
      and s.status = 'scheduled' and s.starts_at > now()
    order by c.id, s.starts_at
  )
  select kind, actor_id, actor_name, class_slug, class_title, cuisine, cover_image_url,
         chef_slug, session_starts_at, session_timezone, activity_at
  from (select * from booked union all select * from hosting) feed
  order by activity_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

revoke execute on function friend_activity from public, anon;
grant execute on function friend_activity to authenticated;
