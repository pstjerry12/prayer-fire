-- ────────────────────────────────────────────────────────────────────────────────
-- Prayer Fire — premium Bible voices (ElevenLabs): which chapters have been generated, and a lock so one chapter is never paid
-- for twice. The audio files themselves live in Supabase Storage (private bucket `bible-audio`).
-- Idempotent: safe to re-run. Only the app's server routes use this table (RLS on, no policies).
-- ────────────────────────────────────────────────────────────────────────────────
create table if not exists bible_audio (
  key text primary key,                 -- v1/<voice>/<translation>/<book>/<chapter>
  voice text not null,
  translation text not null,
  book text not null,                   -- OSIS code, e.g. John, 1Cor
  chapter int not null,
  status text not null default 'generating' check (status in ('generating', 'ready', 'failed')),
  bytes int not null default 0,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bible_audio_created_idx on bible_audio (created_at);
alter table bible_audio enable row level security;
revoke all on bible_audio from anon, authenticated;

-- The private storage bucket for the mp3 files (only the server, with its service key, reads and writes it).
insert into storage.buckets (id, name, public) values ('bible-audio', 'bible-audio', false) on conflict (id) do nothing;
