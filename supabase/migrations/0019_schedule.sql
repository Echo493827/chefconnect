-- chefconnect :: 0019_schedule.sql
-- Schedules the two notification jobs with pg_cron. Run this ONCE, AFTER enabling
-- the pg_cron extension in Supabase (Dashboard -> Database -> Extensions -> pg_cron,
-- or the create extension below if your project allows it in the SQL editor).
-- Re-running will error on the duplicate job names — that's expected; it means
-- the jobs are already scheduled.

create extension if not exists pg_cron;

-- Hourly: catch sessions entering their final 24 hours and remind attendees.
select cron.schedule(
  'chefconnect-session-reminders',
  '0 * * * *',
  $$ select public.send_session_reminders() $$
);

-- Every 6 hours: nudge attendees of recently-ended sessions to review.
select cron.schedule(
  'chefconnect-review-nudges',
  '0 */6 * * *',
  $$ select public.send_review_nudges() $$
);

-- To change a schedule later, unschedule then reschedule, e.g.:
--   select cron.unschedule('chefconnect-session-reminders');
