-- chefconnect :: 0008_notifications.sql
-- Rounds out the notifications the app generates so an attendee's inbox is
-- actually useful, not just the chef's. Adds:
--   * a booking confirmation to the attendee (previously only the chef was told)
--   * class_id on the chef's booking alerts, so they can deep-link to the class
--   * a "recap posted" alert to attendees when a chef shares a recap
-- All inserts run in SECURITY DEFINER triggers (notifications has no insert
-- policy — only the system creates them). Depends on 0001-0007.

-- Chef gets 'booking_received'; the attendee gets their own 'booking_confirmed'.
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
    -- tell the chef
    insert into notifications (user_id, kind, title, body, data)
    values (v_chef_user, 'booking_received', 'New booking: ' || v_title,
            v_name || ' booked a ' || replace(new.seat_type::text, '_', '-') || ' seat.',
            jsonb_build_object('session_id', new.session_id, 'class_id', v_session.class_id, 'booking_id', new.id));
    -- tell the attendee (their confirmation / record of the booking)
    insert into notifications (user_id, kind, title, body, data)
    values (new.user_id, 'booking_confirmed', 'You''re booked: ' || v_title,
            'Your booking is confirmed. The details are in your bookings.',
            jsonb_build_object('session_id', new.session_id, 'class_id', v_session.class_id, 'booking_id', new.id));
  elsif tg_op = 'UPDATE' and new.status = 'cancelled' and old.status <> 'cancelled' and auth.uid() = new.user_id then
    insert into notifications (user_id, kind, title, body, data)
    values (v_chef_user, 'booking_cancelled', 'Booking cancelled: ' || v_title,
            v_name || ' cancelled their seat.',
            jsonb_build_object('session_id', new.session_id, 'class_id', v_session.class_id, 'booking_id', new.id));
  end if;
  return null;
end;
$$;

-- Notify booked attendees when a recap becomes visible (first time it's shared).
create or replace function handle_recap_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_title text;
  v_class uuid;
begin
  if new.published_at is null then
    return null; -- draft, or being unpublished
  end if;
  if tg_op = 'UPDATE' and old.published_at is not null then
    return null; -- already published; an edit shouldn't re-notify
  end if;

  select c.title, c.id into v_title, v_class
    from sessions s join classes c on c.id = s.class_id
   where s.id = new.session_id;

  insert into notifications (user_id, kind, title, body, data)
  select b.user_id,
         'recap_published',
         'Recap posted: ' || v_title,
         'Your chef shared a recap from the class — photos and notes to take home.',
         jsonb_build_object('session_id', new.session_id, 'class_id', v_class)
    from bookings b
   where b.session_id = new.session_id and b.status in ('confirmed', 'attended');
  return null;
end;
$$;

create trigger trg_handle_recap_published
  after insert or update of published_at on recaps
  for each row execute function handle_recap_published();
