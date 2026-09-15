-- chefconnect :: 0013_friends.sql
-- The friend graph: friend requests and accepted friendships. One row per pair
-- in the direction it was first requested. Accepting flips it to 'accepted';
-- declining/cancelling/removing deletes it. Reverse requests auto-accept. Both
-- parties are notified. Depends on 0001-0012. (Stage 1 of the social layer;
-- the activity feed and friend messaging build on this.)

create table friendships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references users(id) on delete cascade,
  addressee_id uuid not null references users(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint friendship_not_self check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);

create index friendships_requester_idx on friendships (requester_id, status);
create index friendships_addressee_idx on friendships (addressee_id, status);

create trigger trg_friendships_updated_at
  before update on friendships
  for each row execute function set_updated_at();

-- Are the caller and p_other accepted friends? (Reused by the feed in stage 2.)
create or replace function are_friends(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from friendships
     where status = 'accepted'
       and ((requester_id = auth.uid() and addressee_id = p_other)
         or (requester_id = p_other and addressee_id = auth.uid()))
  )
$$;

-- ---------- RLS ----------
-- You see friendships you're part of; you can delete them (cancel/decline/remove).
-- Creates and accepts go through the RPCs below (which run as definer).
alter table friendships enable row level security;
create policy "friendships: participant read" on friendships for select using (
  requester_id = auth.uid() or addressee_id = auth.uid()
);
create policy "friendships: participant delete" on friendships for delete using (
  requester_id = auth.uid() or addressee_id = auth.uid()
);

-- ---------- RPC: send_friend_request ----------
create or replace function send_friend_request(p_target uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me     uuid := auth.uid();
  v_rev    uuid;
  v_name   text;
begin
  if v_me is null then
    raise exception 'Sign in to add friends' using errcode = 'insufficient_privilege';
  end if;
  if p_target = v_me then
    raise exception 'You can''t friend yourself' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from users where id = p_target) then
    raise exception 'Person not found' using errcode = 'no_data_found';
  end if;

  -- already friends, or a request already exists this direction: nothing to do
  if exists (
    select 1 from friendships
     where (requester_id = v_me and addressee_id = p_target)
        or (requester_id = p_target and addressee_id = v_me and status = 'accepted')
  ) then
    return;
  end if;

  -- a pending request from them to me? accept it instead of making a new one
  select id into v_rev from friendships
   where requester_id = p_target and addressee_id = v_me and status = 'pending';
  if v_rev is not null then
    update friendships set status = 'accepted' where id = v_rev;
    select display_name into v_name from users where id = v_me;
    insert into notifications (user_id, kind, title, body, data)
    values (p_target, 'friend_accepted', 'You''re now friends', v_name || ' accepted your friend request.',
            jsonb_build_object('user_id', v_me));
    return;
  end if;

  insert into friendships (requester_id, addressee_id, status)
  values (v_me, p_target, 'pending');
  select display_name into v_name from users where id = v_me;
  insert into notifications (user_id, kind, title, body, data)
  values (p_target, 'friend_request', 'New friend request', v_name || ' wants to be friends.',
          jsonb_build_object('user_id', v_me));
end;
$$;

-- ---------- RPC: respond_friend_request ----------
-- Only the addressee of a pending request may respond. Accept flips to accepted
-- (and notifies the requester); decline removes the request.
create or replace function respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row  friendships%rowtype;
  v_name text;
begin
  select * into v_row from friendships where id = p_friendship_id;
  if v_row.id is null or v_row.addressee_id <> auth.uid() or v_row.status <> 'pending' then
    raise exception 'No pending request to respond to' using errcode = 'insufficient_privilege';
  end if;

  if p_accept then
    update friendships set status = 'accepted' where id = p_friendship_id;
    select display_name into v_name from users where id = auth.uid();
    insert into notifications (user_id, kind, title, body, data)
    values (v_row.requester_id, 'friend_accepted', 'You''re now friends', v_name || ' accepted your friend request.',
            jsonb_build_object('user_id', auth.uid()));
  else
    delete from friendships where id = p_friendship_id;
  end if;
end;
$$;

-- ---------- grants ----------
grant select, delete on friendships to authenticated;
grant all on friendships to service_role;
grant execute on function are_friends to authenticated;
revoke execute on function send_friend_request, respond_friend_request from public, anon;
grant execute on function send_friend_request, respond_friend_request to authenticated;
