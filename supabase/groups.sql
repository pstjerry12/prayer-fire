-- ─────────────────────────────────────────────────────────────────────────────
-- Prayer Fire — shared Prayer Groups (server side) with Row Level Security
--
-- Idempotent: safe to re-run. ⚠ `drizzle-kit push` disables RLS on tables it touches and can drop
-- policies it does not know: after every push, re-run this file (and rls.sql).
--
-- HOW THE RULES ARE ENFORCED IN THE DATABASE
-- The app has its own sign-in (not Supabase Auth), so Postgres does not know who is asking. For every
-- group request the server opens ONE transaction and does two things first:
--     select set_config('app.user_id', '<the signed-in user id>', true);
--     set local role app_user;
-- `app_user` is a restricted role (no BYPASSRLS, not the table owner). From then on EVERYTHING in that
-- transaction is judged by the policies and functions below, even if the server code had a bug:
--   • app_user can only SELECT group tables, and only the rows its policies allow;
--   • every write goes through a SECURITY DEFINER function that checks who is asking.
-- Subscription state comes from the `subscriptions` table (filled by RevenueCat's webhook) and Free
-- Premium Mode from `app_settings`, read by app_is_premium() / app_is_leader().
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin noinherit nobypassrls;
  end if;
end $$;
grant app_user to postgres;
grant usage on schema public to app_user;

-- ── Tables ───────────────────────────────────────────────────────────────────

create table if not exists groups (
  id text primary key,
  name text not null,
  description text not null default '',
  join_mode text not null default 'open' check (join_mode in ('open', 'approval')),
  prayer_time text check (prayer_time is null or prayer_time ~ '^[0-2][0-9]:[0-5][0-9]$'),
  pinned_verse text,
  created_by text not null,
  created_at timestamptz not null default now()
);

-- Featured groups (set only by the app's admin, see the Featured groups section below).
alter table groups add column if not exists featured boolean not null default false;
alter table groups add column if not exists featured_at timestamptz;
alter table groups add column if not exists featured_until timestamptz; -- null = no end date

-- Invite codes live apart from the group so only leaders/co-leaders can read them.
create table if not exists group_invites (
  group_id text primary key references groups(id) on delete cascade,
  code text not null unique
);

create table if not exists group_members (
  group_id text not null references groups(id) on delete cascade,
  user_id text not null,
  role text not null default 'member' check (role in ('leader', 'co_leader', 'member')),
  status text not null default 'active' check (status in ('active', 'pending', 'removed', 'blocked')),
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on group_members (user_id);

create table if not exists group_posts (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  kind text not null check (kind in ('message', 'alert', 'request', 'testimony')),
  body text not null check (length(body) between 1 and 2000),
  pinned boolean not null default false,
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists group_posts_group_idx on group_posts (group_id, created_at desc);

create table if not exists group_comments (
  id text primary key,
  post_id text not null references group_posts(id) on delete cascade,
  group_id text not null references groups(id) on delete cascade,
  author_id text not null,
  author_name text not null,
  body text not null check (length(body) between 1 and 1000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  created_at timestamptz not null default now()
);
create index if not exists group_comments_post_idx on group_comments (post_id, created_at);

-- "I'm Praying" on a post.
create table if not exists group_praying (
  post_id text not null references group_posts(id) on delete cascade,
  group_id text not null references groups(id) on delete cascade,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

-- "I prayed today" check-in, one per member per day (Africa/Lagos day, like the rest of the app).
create table if not exists group_checkins (
  group_id text not null references groups(id) on delete cascade,
  user_id text not null,
  day date not null,
  primary key (group_id, user_id, day)
);

-- A member's report of a post or comment, for the leaders' moderation queue. Reports go when their target goes.
create table if not exists group_reports (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  post_id text not null references group_posts(id) on delete cascade,
  comment_id text references group_comments(id) on delete cascade,
  reporter_id text not null,
  reason text not null check (length(reason) between 1 and 300),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  created_at timestamptz not null default now(),
  resolved_by text,
  resolved_at timestamptz
);
-- One report per person per post or comment.
create unique index if not exists group_reports_once on group_reports (reporter_id, post_id, coalesce(comment_id, ''));
create index if not exists group_reports_open_idx on group_reports (group_id, status);

alter table groups enable row level security;
alter table group_invites enable row level security;
alter table group_members enable row level security;
alter table group_posts enable row level security;
alter table group_comments enable row level security;
alter table group_praying enable row level security;
alter table group_checkins enable row level security;
alter table group_reports enable row level security;

-- ── Who is asking, and what do they have? ────────────────────────────────────

create or replace function app_uid() returns text language sql stable as
$$ select nullif(current_setting('app.user_id', true), '') $$;

-- Free Premium Mode: switched on, started (if a start date is set) and not ended (if an end date is set).
create or replace function app_free_mode() returns boolean language sql stable security definer set search_path = public as
$$
  select coalesce((select value from app_settings where key = 'free_mode_enabled'), 'false') = 'true'
     and coalesce((select value::timestamptz from app_settings where key = 'free_mode_start' and value <> '') <= now(), true)
     and coalesce((select value::timestamptz from app_settings where key = 'free_mode_end' and value <> '') > now(), true)
$$;

create or replace function app_has_entitlement(ent text) returns boolean language sql stable security definer set search_path = public as
$$
  select exists (
    select 1 from subscriptions s
    where s.user_id = app_uid() and s.entitlement = ent
      and s.expires_at > now() and s.status not in ('REFUNDED', 'EXPIRED')
  )
$$;

create or replace function app_is_premium() returns boolean language sql stable security definer set search_path = public as
$$ select app_uid() is not null and (app_free_mode() or app_has_entitlement('partner') or app_has_entitlement('leader')) $$;

create or replace function app_is_leader() returns boolean language sql stable security definer set search_path = public as
$$ select app_uid() is not null and (app_free_mode() or app_has_entitlement('leader')) $$;

-- Role of the caller in a group, only while they are an active member AND still premium.
create or replace function app_member_role(gid text) returns text language sql stable security definer set search_path = public as
$$
  select m.role from group_members m
  where m.group_id = gid and m.user_id = app_uid() and m.status = 'active' and app_is_premium()
$$;

create or replace function app_is_member(gid text) returns boolean language sql stable security definer set search_path = public as
$$ select app_member_role(gid) is not null $$;

-- Moderator = leader or co-leader of the group who also holds an active Leader plan (or Free Premium Mode is on).
create or replace function app_is_mod(gid text) returns boolean language sql stable security definer set search_path = public as
$$ select coalesce(app_member_role(gid) in ('leader', 'co_leader'), false) and app_is_leader() $$;

-- ── Read policies (app_user can only read what these allow) ──────────────────

drop policy if exists groups_read on groups;
create policy groups_read on groups for select to app_user using (app_is_member(id) or created_by = app_uid());
drop policy if exists group_invites_read on group_invites;
create policy group_invites_read on group_invites for select to app_user using (app_is_mod(group_id));
drop policy if exists group_members_read on group_members;
create policy group_members_read on group_members for select to app_user
  using (user_id = app_uid() or app_is_mod(group_id) or (status = 'active' and app_is_member(group_id)));
-- Hidden posts/comments stay visible to leaders and to their own author (who is told a leader hid it).
drop policy if exists group_posts_read on group_posts;
create policy group_posts_read on group_posts for select to app_user
  using (app_is_member(group_id) and (status = 'visible' or app_is_mod(group_id) or author_id = app_uid()));
drop policy if exists group_comments_read on group_comments;
create policy group_comments_read on group_comments for select to app_user
  using (app_is_member(group_id) and (status = 'visible' or app_is_mod(group_id) or author_id = app_uid()));
drop policy if exists group_praying_read on group_praying;
create policy group_praying_read on group_praying for select to app_user using (app_is_member(group_id));
drop policy if exists group_checkins_read on group_checkins;
create policy group_checkins_read on group_checkins for select to app_user using (app_is_member(group_id));
-- Leaders/co-leaders read the reports of their group (the app never shows who reported); a member sees only their own.
drop policy if exists group_reports_read on group_reports;
create policy group_reports_read on group_reports for select to app_user using (app_is_mod(group_id) or reporter_id = app_uid());

-- app_user may only read tables; every write goes through the functions below.
revoke all on groups, group_invites, group_members, group_posts, group_comments, group_praying, group_checkins, group_reports from app_user;
grant select on groups, group_invites, group_members, group_posts, group_comments, group_praying, group_checkins, group_reports to app_user;

-- ── Writes: one function per action, each checks the caller ──────────────────

-- Featured groups come first. "Featured" is worked out from the dates every time, so an end date switches it off by itself.
drop function if exists app_group_directory();
create function app_group_directory()
returns table (id text, name text, description text, join_mode text, prayer_time text, created_at timestamptz,
               member_count int, prayed_today int, my_status text, my_role text, featured boolean, featured_until timestamptz)
language sql stable security definer set search_path = public as
$$
  select g.id, g.name, g.description, g.join_mode, g.prayer_time, g.created_at,
    (select count(*)::int from group_members m where m.group_id = g.id and m.status = 'active'),
    (select count(*)::int from group_checkins c where c.group_id = g.id and c.day = (now() at time zone 'Africa/Lagos')::date),
    (select m.status from group_members m where m.group_id = g.id and m.user_id = app_uid()),
    (select m.role from group_members m where m.group_id = g.id and m.user_id = app_uid()),
    (g.featured and (g.featured_until is null or g.featured_until > now())),
    case when g.featured and (g.featured_until is null or g.featured_until > now()) then g.featured_until end
  from groups g
  where app_is_premium()
  order by (g.featured and (g.featured_until is null or g.featured_until > now())) desc,
           case when g.featured and (g.featured_until is null or g.featured_until > now()) then g.featured_at end desc nulls last,
           g.created_at desc
$$;

create or replace function app_create_group(p_name text, p_description text, p_join_mode text, p_prayer_time text, p_pinned_verse text)
returns text language plpgsql security definer set search_path = public as
$$
declare
  gid text := 'g_' || replace(gen_random_uuid()::text, '-', '');
  v_code text;
  disp text;
begin
  if app_uid() is null then raise exception 'signin_required'; end if;
  if not app_is_leader() then raise exception 'leader_required'; end if;
  p_name := btrim(coalesce(p_name, ''));
  if length(p_name) < 2 or length(p_name) > 80 then raise exception 'bad_name'; end if;
  p_description := left(btrim(coalesce(p_description, '')), 500);
  if p_join_mode not in ('open', 'approval') then raise exception 'bad_join_mode'; end if;
  if (select count(*) from groups where created_by = app_uid()) >= 10 then raise exception 'too_many_groups'; end if;
  loop
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
    exit when not exists (select 1 from group_invites i where i.code = v_code);
  end loop;
  select u.name into disp from users u where u.id = app_uid();
  insert into groups (id, name, description, join_mode, prayer_time, pinned_verse, created_by)
    values (gid, p_name, p_description, p_join_mode, nullif(p_prayer_time, ''), nullif(left(btrim(coalesce(p_pinned_verse, '')), 200), ''), app_uid());
  insert into group_invites (group_id, code) values (gid, v_code);
  insert into group_members (group_id, user_id, role, status, display_name)
    values (gid, app_uid(), 'leader', 'active', coalesce(nullif(btrim(disp), ''), 'Leader'));
  return gid;
end $$;

create or replace function app_join_group(p_group text)
returns text language plpgsql security definer set search_path = public as
$$
declare
  g groups%rowtype;
  m group_members%rowtype;
  disp text;
  new_status text;
begin
  if app_uid() is null then raise exception 'signin_required'; end if;
  if not app_is_premium() then raise exception 'premium_required'; end if;
  select * into g from groups where id = p_group;
  if not found then return 'notfound'; end if;
  select * into m from group_members where group_id = p_group and user_id = app_uid();
  if found then
    if m.status = 'active' then return 'already'; end if;
    if m.status = 'pending' then return 'pending'; end if;
    if m.status = 'blocked' then return 'blocked'; end if;
  end if;
  select u.name into disp from users u where u.id = app_uid();
  new_status := case when g.join_mode = 'open' then 'active' else 'pending' end;
  insert into group_members (group_id, user_id, role, status, display_name)
    values (p_group, app_uid(), 'member', new_status, coalesce(nullif(btrim(disp), ''), 'Member'))
  on conflict (group_id, user_id) do update
    set status = excluded.status, role = 'member', display_name = excluded.display_name, joined_at = now();
  return case when new_status = 'active' then 'joined' else 'pending' end;
end $$;

create or replace function app_join_group_by_code(p_code text)
returns text language plpgsql security definer set search_path = public as
$$
declare gid text;
begin
  if app_uid() is null then raise exception 'signin_required'; end if;
  select i.group_id into gid from group_invites i where i.code = upper(btrim(coalesce(p_code, '')));
  if gid is null then return 'notfound'; end if;
  return app_join_group(gid);
end $$;

create or replace function app_leave_group(p_group text)
returns void language plpgsql security definer set search_path = public as
$$
declare r text;
begin
  select role into r from group_members where group_id = p_group and user_id = app_uid();
  if r is null then return; end if;
  if r = 'leader' then raise exception 'leader_cannot_leave'; end if;
  delete from group_members where group_id = p_group and user_id = app_uid();
end $$;

create or replace function app_decide_member(p_group text, p_user text, p_approve boolean)
returns void language plpgsql security definer set search_path = public as
$$
begin
  if not app_is_mod(p_group) then raise exception 'not_allowed'; end if;
  if p_approve then
    update group_members set status = 'active', joined_at = now() where group_id = p_group and user_id = p_user and status = 'pending';
  else
    delete from group_members where group_id = p_group and user_id = p_user and status = 'pending';
  end if;
end $$;

create or replace function app_update_group(p_group text, p_join_mode text, p_prayer_time text, p_pinned_verse text)
returns void language plpgsql security definer set search_path = public as
$$
begin
  if not app_is_mod(p_group) then raise exception 'not_allowed'; end if;
  if p_join_mode not in ('open', 'approval') then raise exception 'bad_join_mode'; end if;
  update groups
    set join_mode = p_join_mode,
        prayer_time = nullif(p_prayer_time, ''),
        pinned_verse = nullif(left(btrim(coalesce(p_pinned_verse, '')), 200), '')
    where id = p_group;
end $$;

create or replace function app_delete_group(p_group text)
returns void language plpgsql security definer set search_path = public as
$$
begin
  if coalesce((select role from group_members where group_id = p_group and user_id = app_uid() and status = 'active'), '') <> 'leader' then
    raise exception 'not_allowed';
  end if;
  delete from groups where id = p_group;
end $$;

create or replace function app_add_post(p_group text, p_kind text, p_body text)
returns text language plpgsql security definer set search_path = public as
$$
declare pid text := 'p_' || replace(gen_random_uuid()::text, '-', '');
        disp text;
begin
  if not app_is_member(p_group) then raise exception 'not_allowed'; end if;
  if p_kind not in ('message', 'alert', 'request', 'testimony') then raise exception 'bad_kind'; end if;
  p_body := btrim(coalesce(p_body, ''));
  if length(p_body) < 1 or length(p_body) > 2000 then raise exception 'bad_body'; end if;
  select display_name into disp from group_members where group_id = p_group and user_id = app_uid();
  insert into group_posts (id, group_id, author_id, author_name, kind, body) values (pid, p_group, app_uid(), disp, p_kind, p_body);
  return pid;
end $$;

create or replace function app_add_comment(p_post text, p_body text)
returns text language plpgsql security definer set search_path = public as
$$
declare cid text := 'c_' || replace(gen_random_uuid()::text, '-', '');
        gid text; disp text;
begin
  select group_id into gid from group_posts where id = p_post and status = 'visible';
  if gid is null or not app_is_member(gid) then raise exception 'not_allowed'; end if;
  p_body := btrim(coalesce(p_body, ''));
  if length(p_body) < 1 or length(p_body) > 1000 then raise exception 'bad_body'; end if;
  select display_name into disp from group_members where group_id = gid and user_id = app_uid();
  insert into group_comments (id, post_id, group_id, author_id, author_name, body) values (cid, p_post, gid, app_uid(), disp, p_body);
  return cid;
end $$;

create or replace function app_toggle_praying(p_post text)
returns boolean language plpgsql security definer set search_path = public as
$$
declare gid text;
begin
  select group_id into gid from group_posts where id = p_post and status = 'visible';
  if gid is null or not app_is_member(gid) then raise exception 'not_allowed'; end if;
  if exists (select 1 from group_praying where post_id = p_post and user_id = app_uid()) then
    delete from group_praying where post_id = p_post and user_id = app_uid();
    return false;
  end if;
  insert into group_praying (post_id, group_id, user_id) values (p_post, gid, app_uid());
  return true;
end $$;

create or replace function app_toggle_checkin(p_group text)
returns boolean language plpgsql security definer set search_path = public as
$$
declare d date := (now() at time zone 'Africa/Lagos')::date;
begin
  if not app_is_member(p_group) then raise exception 'not_allowed'; end if;
  if exists (select 1 from group_checkins where group_id = p_group and user_id = app_uid() and day = d) then
    delete from group_checkins where group_id = p_group and user_id = app_uid() and day = d;
    return false;
  end if;
  insert into group_checkins (group_id, user_id, day) values (p_group, app_uid(), d);
  return true;
end $$;

-- ── Moderation ───────────────────────────────────────────────────────────────

-- Helper: a person's role in a group regardless of premium (used to rank leader above co-leader above member).
create or replace function app_post_group(p_post text) returns text language sql stable security definer set search_path = public as
$$ select group_id from group_posts where id = p_post $$;

-- Remove (or block) a member. Leader: anyone but themselves. Co-leader: ordinary members only.
-- Removed people may ask to join again; blocked people cannot. Optionally hides their posts and comments.
create or replace function app_remove_member(p_group text, p_user text, p_block boolean, p_hide_posts boolean)
returns void language plpgsql security definer set search_path = public as
$$
declare mine text; theirs text;
begin
  if not app_is_mod(p_group) then raise exception 'not_allowed'; end if;
  if p_user = app_uid() then raise exception 'cannot_target_self'; end if;
  mine := app_member_role(p_group);
  select role into theirs from group_members where group_id = p_group and user_id = p_user;
  if theirs is null then return; end if;
  if theirs = 'leader' or (mine = 'co_leader' and theirs <> 'member') then raise exception 'not_allowed'; end if;
  if p_hide_posts then
    update group_posts set status = 'hidden' where group_id = p_group and author_id = p_user;
    update group_comments set status = 'hidden' where group_id = p_group and author_id = p_user;
  end if;
  if p_block then
    update group_members set status = 'blocked', role = 'member' where group_id = p_group and user_id = p_user;
  else
    delete from group_members where group_id = p_group and user_id = p_user;
  end if;
end $$;

create or replace function app_unblock_member(p_group text, p_user text)
returns void language plpgsql security definer set search_path = public as
$$
begin
  if not app_is_mod(p_group) then raise exception 'not_allowed'; end if;
  delete from group_members where group_id = p_group and user_id = p_user and status = 'blocked';
end $$;

-- Only the group's leader appoints or removes co-leaders (at most 3).
create or replace function app_set_role(p_group text, p_user text, p_role text)
returns void language plpgsql security definer set search_path = public as
$$
begin
  if coalesce(app_member_role(p_group), '') <> 'leader' or not app_is_leader() then raise exception 'not_allowed'; end if;
  if p_role not in ('co_leader', 'member') then raise exception 'bad_role'; end if;
  if p_user = app_uid() then raise exception 'cannot_target_self'; end if;
  if not exists (select 1 from group_members where group_id = p_group and user_id = p_user and status = 'active' and role <> 'leader') then
    raise exception 'not_allowed';
  end if;
  if p_role = 'co_leader' and (select count(*) from group_members where group_id = p_group and role = 'co_leader' and user_id <> p_user) >= 3 then
    raise exception 'too_many_coleaders';
  end if;
  update group_members set role = p_role where group_id = p_group and user_id = p_user;
end $$;

-- Hide a post (or bring it back). Hidden posts disappear for members; the author and leaders still see them.
create or replace function app_set_post_hidden(p_post text, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as
$$
declare gid text := app_post_group(p_post);
begin
  if gid is null or not app_is_mod(gid) then raise exception 'not_allowed'; end if;
  update group_posts set status = case when p_hidden then 'hidden' else 'visible' end, pinned = pinned and not p_hidden where id = p_post;
end $$;

create or replace function app_set_comment_hidden(p_comment text, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as
$$
declare gid text;
begin
  select group_id into gid from group_comments where id = p_comment;
  if gid is null or not app_is_mod(gid) then raise exception 'not_allowed'; end if;
  update group_comments set status = case when p_hidden then 'hidden' else 'visible' end where id = p_comment;
end $$;

-- Delete a post: its author may delete their own; leaders may delete any.
create or replace function app_delete_post(p_post text)
returns void language plpgsql security definer set search_path = public as
$$
declare gid text; author text;
begin
  select group_id, author_id into gid, author from group_posts where id = p_post;
  if gid is null then return; end if;
  if not (app_is_mod(gid) or (author = app_uid() and app_is_member(gid))) then raise exception 'not_allowed'; end if;
  delete from group_posts where id = p_post;
end $$;

create or replace function app_delete_comment(p_comment text)
returns void language plpgsql security definer set search_path = public as
$$
declare gid text; author text;
begin
  select group_id, author_id into gid, author from group_comments where id = p_comment;
  if gid is null then return; end if;
  if not (app_is_mod(gid) or (author = app_uid() and app_is_member(gid))) then raise exception 'not_allowed'; end if;
  delete from group_comments where id = p_comment;
end $$;

-- Pin a post to the top of the group (at most 3 pinned, only visible posts).
create or replace function app_pin_post(p_post text, p_pinned boolean)
returns void language plpgsql security definer set search_path = public as
$$
declare gid text := app_post_group(p_post);
begin
  if gid is null or not app_is_mod(gid) then raise exception 'not_allowed'; end if;
  if p_pinned then
    if not exists (select 1 from group_posts where id = p_post and status = 'visible') then raise exception 'not_allowed'; end if;
    if (select count(*) from group_posts where group_id = gid and pinned and id <> p_post) >= 3 then raise exception 'too_many_pins'; end if;
  end if;
  update group_posts set pinned = p_pinned where id = p_post;
end $$;

-- A member reports a post or comment (not their own). One report per person per item.
create or replace function app_report(p_post text, p_comment text, p_reason text)
returns void language plpgsql security definer set search_path = public as
$$
declare gid text := app_post_group(p_post); author text; c_post text;
begin
  if gid is null or not app_is_member(gid) then raise exception 'not_allowed'; end if;
  p_reason := btrim(coalesce(p_reason, ''));
  if length(p_reason) < 1 or length(p_reason) > 300 then raise exception 'bad_reason'; end if;
  if p_comment is not null and p_comment <> '' then
    select author_id, post_id into author, c_post from group_comments where id = p_comment and group_id = gid;
    if author is null or c_post <> p_post then raise exception 'not_allowed'; end if;
  else
    p_comment := null;
    select author_id into author from group_posts where id = p_post;
  end if;
  if author = app_uid() then raise exception 'cannot_target_self'; end if;
  insert into group_reports (id, group_id, post_id, comment_id, reporter_id, reason)
    values ('r_' || replace(gen_random_uuid()::text, '-', ''), gid, p_post, p_comment, app_uid(), p_reason)
  on conflict do nothing;
end $$;

-- Close a report: dismiss it, or hide / delete what was reported. Every open report on the same item is closed together.
create or replace function app_resolve_report(p_report text, p_action text)
returns void language plpgsql security definer set search_path = public as
$$
declare r group_reports%rowtype;
begin
  select * into r from group_reports where id = p_report;
  if not found or not app_is_mod(r.group_id) then raise exception 'not_allowed'; end if;
  if p_action not in ('dismiss', 'hide', 'delete') then raise exception 'bad_action'; end if;
  if p_action = 'hide' then
    if r.comment_id is not null then update group_comments set status = 'hidden' where id = r.comment_id;
    else update group_posts set status = 'hidden', pinned = false where id = r.post_id; end if;
  elsif p_action = 'delete' then
    if r.comment_id is not null then delete from group_comments where id = r.comment_id;
    else delete from group_posts where id = r.post_id; end if;
  end if;
  -- (a delete removes the reports with their target; for dismiss/hide close all open reports on the same item)
  update group_reports set status = case when p_action = 'dismiss' then 'dismissed' else 'actioned' end, resolved_by = app_uid(), resolved_at = now()
    where group_id = r.group_id and post_id = r.post_id and coalesce(comment_id, '') = coalesce(r.comment_id, '') and status = 'open';
end $$;

-- ── Analytics (the group's own leader only) ─────────────────────────────────
-- Counts and per-day totals for the last 30 days (Africa/Lagos days, today included); the app shows 7 or 30 of them.
-- It returns NUMBERS ONLY: no member names or ids. "Activity" = posts + comments + "I'm praying" taps + check-ins.
-- Hidden posts (and what happened on them) are not counted.
create or replace function app_group_analytics(p_group text)
returns jsonb language plpgsql stable security definer set search_path = public as
$$
declare
  today date := (now() at time zone 'Africa/Lagos')::date;
  result jsonb;
begin
  if coalesce(app_member_role(p_group), '') <> 'leader' or not app_is_leader() then raise exception 'not_allowed'; end if;
  with days as (
    select d::date as day from generate_series(today - 29, today, interval '1 day') d
  ),
  posts as (
    select (created_at at time zone 'Africa/Lagos')::date as day, kind from group_posts where group_id = p_group and status = 'visible'
  ),
  comments as (
    select (c.created_at at time zone 'Africa/Lagos')::date as day
    from group_comments c join group_posts p on p.id = c.post_id
    where c.group_id = p_group and c.status = 'visible' and p.status = 'visible'
  ),
  prays as (
    select (r.created_at at time zone 'Africa/Lagos')::date as day
    from group_praying r join group_posts p on p.id = r.post_id
    where r.group_id = p_group and p.status = 'visible'
  ),
  checks as (select day from group_checkins where group_id = p_group),
  joins as (
    select (joined_at at time zone 'Africa/Lagos')::date as day from group_members
    where group_id = p_group and status = 'active' and role <> 'leader'
  ),
  daily as (
    select d.day,
      (select count(*) from joins j where j.day = d.day)::int as members,
      (select count(*) from posts x where x.day = d.day and x.kind = 'request')::int as requests,
      (select count(*) from posts x where x.day = d.day and x.kind = 'testimony')::int as testimonies,
      (select count(*) from prays x where x.day = d.day)::int as praying,
      ((select count(*) from posts x where x.day = d.day) + (select count(*) from comments x where x.day = d.day)
        + (select count(*) from prays x where x.day = d.day) + (select count(*) from checks x where x.day = d.day))::int as activity
    from days d
  )
  select jsonb_build_object(
    'today', today,
    'members', jsonb_build_object(
      'total', (select count(*) from group_members where group_id = p_group and status = 'active'),
      'new7', (select count(*) from joins where day > today - 7),
      'new30', (select count(*) from joins where day > today - 30)),
    'requests', jsonb_build_object(
      'total', (select count(*) from posts where kind = 'request'),
      'last7', (select count(*) from posts where kind = 'request' and day > today - 7),
      'last30', (select count(*) from posts where kind = 'request' and day > today - 30)),
    'testimonies', jsonb_build_object(
      'total', (select count(*) from posts where kind = 'testimony'),
      'last7', (select count(*) from posts where kind = 'testimony' and day > today - 7),
      'last30', (select count(*) from posts where kind = 'testimony' and day > today - 30)),
    'praying', jsonb_build_object(
      'total', (select count(*) from prays),
      'last7', (select count(*) from prays where day > today - 7),
      'last30', (select count(*) from prays where day > today - 30)),
    'daily', (select jsonb_agg(jsonb_build_object('day', day, 'members', members, 'requests', requests, 'testimonies', testimonies, 'praying', praying, 'activity', activity) order by day) from daily),
    'weekday', (select jsonb_agg(jsonb_build_object('dow', w.dow, 'activity', coalesce(a.n, 0)) order by w.dow)
                from generate_series(1, 7) w(dow)
                left join (select extract(isodow from day)::int as dow, sum(activity)::int as n from daily group by 1) a on a.dow = w.dow),
    'topDays', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'activity', activity) order by activity desc, day desc), '[]'::jsonb)
                from (select day, activity from daily where activity > 0 order by activity desc, day desc limit 3) t)
  ) into result;
  return result;
end $$;

-- ── Featured groups ──────────────────────────────────────────────────────────
-- A leader can only ASK to be featured. Approving, removing and end dates are done by the app's admin from the admin
-- panel (the owner connection); app_user has no write access to the featured columns.

create table if not exists group_feature_requests (
  id text primary key,
  group_id text not null references groups(id) on delete cascade,
  requested_by text not null,
  message text not null default '' check (length(message) <= 300),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  decision_note text check (decision_note is null or length(decision_note) <= 200),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);
create unique index if not exists group_feature_one_pending on group_feature_requests (group_id) where status = 'pending';
alter table group_feature_requests enable row level security;
drop policy if exists group_feature_requests_read on group_feature_requests;
create policy group_feature_requests_read on group_feature_requests for select to app_user using (coalesce(app_member_role(group_id), '') = 'leader');
revoke all on group_feature_requests from app_user;
grant select on group_feature_requests to app_user;

create or replace function app_request_featuring(p_group text, p_message text)
returns void language plpgsql security definer set search_path = public as
$$
begin
  if coalesce(app_member_role(p_group), '') <> 'leader' or not app_is_leader() then raise exception 'not_allowed'; end if;
  if exists (select 1 from groups where id = p_group and featured and (featured_until is null or featured_until > now())) then raise exception 'already_featured'; end if;
  if exists (select 1 from group_feature_requests where group_id = p_group and status = 'pending') then raise exception 'request_pending'; end if;
  if exists (select 1 from group_feature_requests where group_id = p_group and status = 'rejected' and decided_at > now() - interval '7 days') then raise exception 'request_cooldown'; end if;
  insert into group_feature_requests (id, group_id, requested_by, message)
    values ('f_' || replace(gen_random_uuid()::text, '-', ''), p_group, app_uid(), left(btrim(coalesce(p_message, '')), 300));
end $$;

create or replace function app_cancel_featuring(p_group text)
returns void language plpgsql security definer set search_path = public as
$$
begin
  if coalesce(app_member_role(p_group), '') <> 'leader' then raise exception 'not_allowed'; end if;
  update group_feature_requests set status = 'cancelled', decided_at = now() where group_id = p_group and status = 'pending';
end $$;

-- Only app_user may call these (Supabase's public anon/authenticated roles may not).
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'app\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to app_user', f.sig);
  end loop;
end $$;
