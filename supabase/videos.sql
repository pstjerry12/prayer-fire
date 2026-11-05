-- ────────────────────────────────────────────────────────────────────────────────
-- Prayer Fire — admin-managed YouTube videos (tutorials, podcast, short teachings)
-- Idempotent: safe to re-run. Only the app's server routes use this table (RLS on, no policies).
-- ────────────────────────────────────────────────────────────────────────────────
create table if not exists videos (
  id text primary key,
  youtube_id text not null,
  title text not null,
  channel text not null default '',
  kind text not null check (kind in ('tutorial', 'podcast', 'teaching')),
  feature text,                       -- tutorials: which feature it explains (see src/lib/videos.ts FEATURES)
  sort int not null default 0,        -- tutorials: order in "How to use Prayer Fire" (lower first)
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists videos_youtube_kind_idx on videos (youtube_id, kind);
create index if not exists videos_kind_idx on videos (kind, published, created_at desc);
alter table videos enable row level security;
revoke all on videos from anon, authenticated;
