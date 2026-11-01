'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark as BookmarkIcon, BookOpenText, Check, ChevronLeft, ChevronRight, Copy, Highlighter, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/app/utils/cn';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import SermonStartModal from '@/app/components/SermonStartModal';
import { copyText } from '@/lib/clipboard';
import {
  formatVerse,
  HIGHLIGHT_COLORS,
  liveEntries,
  liveSermons,
  setHighlights,
  toggleBookmarks,
  togglePrayerBookmark,
  useStudy,
  type StudyVerse,
} from '@/lib/study';
import { HIGHLIGHT_STYLES } from '@/lib/highlightStyles';
import { entryShortName, formatSermonDate, studyDayLabel } from '@/lib/studyFormat';
import { getTranslationMeta, type TranslationId } from '@/lib/bible/translations';
import { KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';
import { migrateLegacyFavorites } from '@/lib/study';
import { PRAYER_VERSE_PATH } from '@/app/components/PrayerVerseCard';

type Tab = 'bookmarks' | 'highlights' | 'sermons';
const TAB_KEY = 'pfm_study_tab';

const TABS: { id: Tab; label: string; icon: typeof BookmarkIcon }[] = [
  { id: 'bookmarks', label: 'Bookmarks', icon: BookmarkIcon },
  { id: 'highlights', label: 'Highlights', icon: Highlighter },
  { id: 'sermons', label: 'Sermon Notes', icon: BookOpenText },
];

function shortName(id: string): string {
  try {
    return getTranslationMeta(id as TranslationId).shortName;
  } catch {
    return id.toUpperCase();
  }
}

function versePath(v: Pick<StudyVerse, 'osis' | 'chapter' | 'verse'>): string {
  return `/bible/verse/${v.osis}/${v.chapter}/${v.verse}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async (e) => {
        e.stopPropagation();
        if (await copyText(value)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        }
      }}
      className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink"
    >
      {copied ? <Check className="w-3 h-3 text-acc-strong" /> : <Copy className="w-3 h-3" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

interface BookmarkRow {
  key: string;
  at: number;
  kind: 'bible' | 'prayer';
  reference: string;
  text: string;
  translation: string;
  open: () => void;
  remove: () => void;
}

function BookmarksTab() {
  const router = useRouter();
  const study = useStudy();

  const groups = useMemo(() => {
    const rows: BookmarkRow[] = [];
    for (const v of Object.values(study.verses)) {
      if (v.bookmarkedAt == null) continue;
      rows.push({
        key: v.key,
        at: v.bookmarkedAt,
        kind: 'bible',
        reference: v.reference,
        text: v.text,
        translation: shortName(v.translationId),
        open: () => router.push(versePath(v)),
        remove: () =>
          toggleBookmarks([{ translationId: v.translationId, osis: v.osis, chapter: v.chapter, verse: v.verse, reference: v.reference, text: v.text }]),
      });
    }
    for (const p of Object.values(study.prayer)) {
      if (p.bookmarkedAt == null) continue;
      rows.push({
        key: `prayer:${p.id}`,
        at: p.bookmarkedAt,
        kind: 'prayer',
        reference: p.reference,
        text: p.text,
        translation: 'KJV',
        open: () => router.push(PRAYER_VERSE_PATH(p.id)),
        remove: () => togglePrayerBookmark(p.id, p.reference, p.text),
      });
    }
    rows.sort((a, b) => b.at - a.at);
    const out: { label: string; rows: BookmarkRow[] }[] = [];
    for (const row of rows) {
      const label = studyDayLabel(row.at);
      const last = out[out.length - 1];
      if (last && last.label === label) last.rows.push(row);
      else out.push({ label, rows: [row] });
    }
    return out;
  }, [study.verses, study.prayer, router]);

  if (groups.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-edge p-8 text-center">
        <BookmarkIcon className="w-8 h-8 text-ink-faint mx-auto mb-3" />
        <p className="font-bold text-ink text-sm">No bookmarks yet</p>
        <p className="text-xs text-ink-muted mt-1.5 max-w-xs mx-auto">Hold any verse, then choose Bookmark. It will be saved here, grouped by the day you saved it.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.label}>
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">{g.label}</h2>
          <div className="space-y-3">
            {g.rows.map((r) => (
              <div key={r.key} className="rounded-xl border border-edge p-4" style={{ background: 'var(--hl-bookmark)' }}>
                <button onClick={r.open} className="block w-full text-left">
                  <p className="text-acc-strong text-xs font-semibold mb-1.5">
                    {r.reference}
                    <span className="ml-1.5 text-ink-muted font-medium">· {r.translation}</span>
                    <span className="ml-1.5 text-ink-faint font-medium">· {r.kind === 'bible' ? 'Bible' : 'Prayer verse'}</span>
                  </p>
                  <p className="text-ink-soft text-sm leading-relaxed">&ldquo;{r.text}&rdquo;</p>
                </button>
                <div className="flex gap-4 mt-3">
                  <CopyButton value={formatVerse(r.reference, r.translation, r.text)} />
                  <button onClick={r.remove} className="flex items-center gap-1 text-xs text-ink-muted hover:text-danger">
                    <Trash2 className="w-3 h-3" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function HighlightsTab() {
  const router = useRouter();
  const study = useStudy();

  const groups = useMemo(() => {
    const byColor = new Map<string, StudyVerse[]>();
    for (const v of Object.values(study.verses)) {
      if (!v.highlight) continue;
      byColor.set(v.highlight, [...(byColor.get(v.highlight) ?? []), v]);
    }
    return HIGHLIGHT_COLORS.filter((c) => byColor.has(c)).map((color) => ({
      color,
      verses: (byColor.get(color) ?? []).sort((a, b) => (b.highlightedAt ?? 0) - (a.highlightedAt ?? 0)),
    }));
  }, [study.verses]);

  if (groups.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-edge p-8 text-center">
        <Highlighter className="w-8 h-8 text-ink-faint mx-auto mb-3" />
        <p className="font-bold text-ink text-sm">No highlights yet</p>
        <p className="text-xs text-ink-muted mt-1.5 max-w-xs mx-auto">Hold a verse, choose Highlight colour, and pick one. Your highlights are grouped by colour here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.color}>
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink-muted mb-2">
            <span className="inline-block w-3.5 h-3.5 rounded-full" style={{ background: HIGHLIGHT_STYLES[g.color].swatch }} />
            {HIGHLIGHT_STYLES[g.color].label} · {g.verses.length}
          </h2>
          <div className="space-y-3">
            {g.verses.map((v) => (
              <div key={v.key} className="rounded-xl border border-edge p-4" style={{ background: HIGHLIGHT_STYLES[g.color].bg }}>
                <button onClick={() => router.push(versePath(v))} className="block w-full text-left">
                  <p className="text-acc-strong text-xs font-semibold mb-1.5">
                    {v.reference}
                    <span className="ml-1.5 text-ink-muted font-medium">· {shortName(v.translationId)}</span>
                  </p>
                  <p className="text-ink-soft text-sm leading-relaxed">&ldquo;{v.text}&rdquo;</p>
                </button>
                <div className="flex gap-4 mt-3">
                  <CopyButton value={formatVerse(v.reference, shortName(v.translationId), v.text)} />
                  <button
                    onClick={() =>
                      setHighlights([{ translationId: v.translationId, osis: v.osis, chapter: v.chapter, verse: v.verse, reference: v.reference, text: v.text }], null)
                    }
                    className="flex items-center gap-1 text-xs text-ink-muted hover:text-danger"
                  >
                    <Trash2 className="w-3 h-3" /> Remove highlight
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SermonsTab() {
  const router = useRouter();
  const study = useStudy();
  const [starting, setStarting] = useState(false);
  const sermons = liveSermons(study);

  return (
    <div className="space-y-4">
      <button
        onClick={() => setStarting(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-acc text-on-acc text-sm font-bold hover:bg-acc-hover active:scale-[0.99]"
      >
        <Plus className="w-4 h-4" /> Start a Sermon Session
      </button>
      <p className="text-xs text-ink-muted -mt-1">During a service, start a session. Then hold any verse in the Bible and choose Add to Sermon Notes — it is saved here, in order.</p>

      {sermons.length === 0 ? (
        <div className="bg-card rounded-2xl border border-edge p-8 text-center">
          <BookOpenText className="w-8 h-8 text-ink-faint mx-auto mb-3" />
          <p className="font-bold text-ink text-sm">No sermons yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sermons.map((s) => {
            const count = liveEntries(s).length;
            const active = study.activeSermonId === s.id;
            return (
              <button
                key={s.id}
                onClick={() => router.push(`/study/sermon/${s.id}`)}
                className="w-full text-left bg-card rounded-xl border border-edge p-4 hover:bg-card-2 active:bg-card-2 flex items-center gap-3"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-acc-soft text-acc-strong shrink-0">
                  <BookOpenText className="w-5 h-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-ink text-sm truncate">{s.title}</span>
                  <span className="block text-xs text-ink-muted truncate">
                    {[s.preacher, formatSermonDate(s.date)].filter(Boolean).join(' · ')}
                  </span>
                  <span className="block text-[0.6875rem] text-ink-faint mt-0.5">
                    {count} {count === 1 ? 'verse' : 'verses'}
                    {active && <span className="ml-2 rounded-full bg-acc-soft border border-acc-edge px-2 py-0.5 text-acc-strong font-bold">Active session</span>}
                  </span>
                </span>
                <ChevronRight className="w-4 h-4 text-ink-faint shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      {starting && (
        <SermonStartModal
          onClose={() => setStarting(false)}
          onStarted={(id) => {
            setStarting(false);
            router.push(`/study/sermon/${id}`);
          }}
        />
      )}
    </div>
  );
}

export default function StudyPage() {
  const [tab, setTabState] = useState<Tab>('bookmarks');

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(TAB_KEY);
      // Saved tab is only readable on the client, after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved === 'bookmarks' || saved === 'highlights' || saved === 'sermons') setTabState(saved);
    } catch {
      // ignore
    }
    migrateLegacyFavorites(KJV_BIBLE_VERSES);
  }, []);

  function setTab(next: Tab) {
    setTabState(next);
    try {
      sessionStorage.setItem(TAB_KEY, next);
    } catch {
      // ignore
    }
  }

  return (
    <>
      <Navbar />
      <main className="max-w-3xl md:max-w-4xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/bible" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong mb-4">
          <ChevronLeft className="w-4 h-4" /> Bible
        </Link>

        <div className="mb-5">
          <h1 className="font-serif-heading text-2xl font-bold text-ink">My Study</h1>
          <p className="text-xs text-ink-muted">Bookmarks, highlights and sermon notes — saved on this phone, and backed up when you&apos;re signed in.</p>
        </div>

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-card-2 p-1 mb-5" role="tablist">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                'py-2 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1 transition-all',
                tab === id ? 'bg-card text-acc-strong shadow-sm' : 'text-ink-muted'
              )}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === 'bookmarks' ? <BookmarksTab /> : tab === 'highlights' ? <HighlightsTab /> : <SermonsTab />}
      </main>
      <Footer />
    </>
  );
}
