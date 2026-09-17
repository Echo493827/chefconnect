-- chefconnect :: 0005_moderation.sql
-- Reactive moderation, matching the "anyone can teach" model: no review gate on
-- the way in, but admins can pull content and suspend chefs after the fact.
-- Adds a suspension flag, hides suspended chefs and their classes from the
-- public, and gives admins a small set of audited RPCs. Depends on 0001-0004.

-- ---------- suspension flag ----------
alter table chef_profiles
  add column if not exists is_suspended boolean not null default false;

-- SECURITY DEFINER so it can read the flag regardless of the caller's own RLS,
-- which is what lets the policies below use it without recursive visibility gaps.
create or replace function is_chef_suspended(p_chef_profile_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_suspended from chef_profiles where id = p_chef_profile_id), false)
$$;

-- ---------- hide suspended chefs from the public ----------
-- The owner still sees their own profile (so a suspended chef can sign in and
-- read what happened), and admins see everything.
drop policy if exists "chef_profiles: public read" on chef_profiles;
create policy "chef_profiles: public read" on chef_profiles for select using (
  not is_suspended or user_id = auth.uid() or is_admin()
);

-- A published class is public only while its chef is in good standing. The chef
-- keeps full access to their own classes (any status), and admins see all.
drop policy if exists "classes: published or own read" on classes;
create policy "classes: published or own read" on classes for select using (
  (status = 'published' and not is_chef_suspended(chef_profile_id))
  or chef_profile_id = current_chef_profile_id()
  or is_admin()
);

-- Sessions ride on class visibility: fold the suspension check into the helper
-- the sessions policy already uses, so a suspended chef's sessions disappear too.
create or replace function is_class_published(p_class_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from classes c
     where c.id = p_class_id
       and c.status = 'published'
       and not is_chef_suspended(c.chef_profile_id)
  )
$$;

-- ---------- admin RPCs ----------
-- Each checks is_admin() itself and touches only the one field it names, so the
-- admin UI can call them with the normal (RLS-scoped) client and we never open a
-- blanket admin-write policy on these tables.

create or replace function admin_set_class_status(p_class_id uuid, p_status class_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = 'insufficient_privilege';
  end if;
  update classes set status = p_status where id = p_class_id;
  if not found then
    raise exception 'Class not found' using errcode = 'no_data_found';
  end if;
end;
$$;

create or replace function admin_set_chef_suspended(p_chef_profile_id uuid, p_suspended boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = 'insufficient_privilege';
  end if;
  update chef_profiles set is_suspended = p_suspended where id = p_chef_profile_id;
  if not found then
    raise exception 'Chef not found' using errcode = 'no_data_found';
  end if;
end;
$$;

create or replace function resolve_report(p_report_id uuid, p_status report_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then
    raise exception 'Admins only' using errcode = 'insufficient_privilege';
  end if;
  if p_status = 'open' then
    raise exception 'Pick a resolution other than open' using errcode = 'check_violation';
  end if;
  update reports
     set status = p_status, resolved_by = auth.uid(), resolved_at = now()
   where id = p_report_id;
  if not found then
    raise exception 'Report not found' using errcode = 'no_data_found';
  end if;
end;
$$;

revoke execute on function admin_set_class_status, admin_set_chef_suspended, resolve_report from public, anon;
grant  execute on function admin_set_class_status, admin_set_chef_suspended, resolve_report to authenticated;
grant  execute on function is_chef_suspended to anon, authenticated;
