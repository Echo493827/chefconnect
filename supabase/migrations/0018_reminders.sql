-- chefconnect :: 0018_reminders.sql
-- Scheduled notification generators: a day-before reminder for upcoming sessions,
-- and a review nudge after a session ends (for attendees who haven't reviewed).
-- Both are idempotent — a per-session timestamp ensures each fires once. They're
-- run by pg_cron (scheduled in 0019). Depends on 0001-0017.

alter table sessions
  add column if not exists reminder_sent_at     timestamptz,
  add column if not exists review_nudge_sent_at timestamptz;

-- Remind confirmed attendees of sessions starting within the next 24 hours.
create or replace function send_session_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  create temp table _due on commit drop as
    select id, class_id from sessions
     where status = 'scheduled' and reminder_sent_at is null
       and starts_at > now() and starts_at <= now() + interval '24 hours';

  insert into notifications (user_id, kind, title, body, data)
  select b.user_id, 'reminder', 'Reminder: ' || c.title || ' is coming up',
         'Your class is within the next day. The details are in your bookings.',
         jsonb_build_object('session_id', d.id, 'class_id', d.class_id, 'booking_id', b.id)
    from _due d
    join classes c on c.id = d.class_id
    join bookings b on b.session_id = d.id and b.status = 'confirmed';

  update sessions set reminder_sent_at = now() where id in (select id from _due);
end;
$$;

-- Nudge attendees of recently-ended sessions who haven't left a review yet.
create or replace function send_review_nudges()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  create temp table _ended on commit drop as
    select id, class_id from sessions
     where status in ('scheduled', 'completed') and review_nudge_sent_at is null
       and ends_at < now() and ends_at > now() - interval '7 days';

  insert into notifications (user_id, kind, title, body, data)
  select b.user_id, 'review_nudge', 'How was ' || c.title || '?',
         'Leave a quick review to help other cooks choose.',
         jsonb_build_object('booking_id', b.id, 'session_id', e.id)
    from _ended e
    join classes c on c.id = e.class_id
    join bookings b on b.session_id = e.id and b.status in ('confirmed', 'attended')
   where not exists (select 1 from reviews r where r.booking_id = b.id);

  update sessions set review_nudge_sent_at = now() where id in (select id from _ended);
end;
$$;

-- Only the scheduler (service role / cron) runs these, never end users.
revoke execute on function send_session_reminders, send_review_nudges from public, anon, authenticated;
grant execute on function send_session_reminders, send_review_nudges to service_role;
