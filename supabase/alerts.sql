-- ────────────────────────────────────────────────────────────────────────────────
-- Prayer Fire — Global Prayer Alerts (urgent worldwide prayer needs)
--
-- Idempotent: safe to re-run. ⚠ `drizzle-kit push` can disable RLS on tables it touches: re-run after a push.
-- These tables are only ever read and written by the app's own server routes (the owner connection), never by the
-- restricted `app_user` role or Supabase's anon/authenticated roles, so RLS is ON with no policies (= nobody else).
-- ────────────────────────────────────────────────────────────────────────────────

create table if not exists global_alerts (
  id text primary key,
  title text not null,
  summary text not null default '',
  scriptures jsonb not null default '[]'::jsonb,   -- ["Psalm 91:1-2", ...]
  points jsonb not null default '[]'::jsonb,       -- ["Pray for ...", ...]
  country text,                                    -- the country it is about (null = worldwide)
  status text not null default 'live' check (status in ('draft', 'live', 'ended')),
  source text not null default 'admin' check (source in ('admin', 'leader')),
  author_name text not null default 'Prayer Fire',
  author_id text,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  ends_at timestamptz
);
create index if not exists global_alerts_status_idx on global_alerts (status, created_at desc);

-- "I'm praying": one per person per alert, with the country they were in when they tapped (from the request, never a precise location).
create table if not exists alert_praying (
  alert_id text not null references global_alerts(id) on delete cascade,
  user_id text not null,
  country text not null default 'XX',              -- ISO 3166-1 alpha-2, or XX when unknown
  created_at timestamptz not null default now(),
  primary key (alert_id, user_id)
);

-- Updates and answered-prayer testimonies the admin adds under an alert.
create table if not exists alert_updates (
  id text primary key,
  alert_id text not null references global_alerts(id) on delete cascade,
  kind text not null check (kind in ('update', 'testimony')),
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists alert_updates_alert_idx on alert_updates (alert_id, created_at desc);

-- A Leader's request to raise a PUBLIC prayer altar. It becomes a public alert only when the admin approves it.
create table if not exists alert_requests (
  id text primary key,
  user_id text not null,
  author_name text not null,
  title text not null,
  summary text not null default '',
  scriptures jsonb not null default '[]'::jsonb,
  points jsonb not null default '[]'::jsonb,
  country text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text,
  alert_id text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
create index if not exists alert_requests_status_idx on alert_requests (status, created_at);

alter table global_alerts enable row level security;
alter table alert_praying enable row level security;
alter table alert_updates enable row level security;
alter table alert_requests enable row level security;
revoke all on global_alerts, alert_praying, alert_updates, alert_requests from anon, authenticated;
