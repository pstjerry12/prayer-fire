'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ScrollText, Search } from 'lucide-react';
import { KJV_BIBLE_CATEGORIES, KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';
import PrayerVerseCard from './PrayerVerseCard';

/**
 * Prayer Verses home: a grid of topics. Tapping a topic opens it on its own
 * page (/bible/topic/<id>); typing in the search box lists matching verses here.
 */
export default function BibleLibrary() {
  const router = useRouter();
  const [search, setSearch] = useState('');

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of KJV_BIBLE_VERSES) map.set(v.category, (map.get(v.category) ?? 0) + 1);
    return map;
  }, []);

  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return KJV_BIBLE_VERSES.filter((v) => v.reference.toLowerCase().includes(q) || v.text.toLowerCase().includes(q));
  }, [search]);

  const searching = search.trim().length > 0;

  return (
    <div className="bg-card rounded-2xl border border-edge shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-edge flex items-center gap-3">
        <div className="p-2 rounded-lg bg-acc-soft text-acc-strong"><ScrollText className="w-5 h-5" /></div>
        <div>
          <h2 className="font-bold text-ink">Prayer Verses</h2>
          <p className="text-xs text-ink-muted">Themed verses for your prayer life</p>
        </div>
      </div>
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
          <input
            type="text"
            placeholder="Search verses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-edge-strong rounded-xl pl-10 pr-4 py-2 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-acc-hover/40 focus:border-acc-hover"
          />
        </div>

        {searching ? (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {results.length === 0 ? (
              <p className="text-center text-ink-muted py-8">No verses found</p>
            ) : (
              <>
                <p className="text-[0.6875rem] text-ink-muted">Tap a verse to open it · hold a verse for copy, read aloud and bookmark</p>
                {results.map((verse) => (
                  <PrayerVerseCard key={verse.id} verse={verse} />
                ))}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {KJV_BIBLE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => router.push(`/bible/topic/${encodeURIComponent(cat.id)}`)}
                  className="bg-card rounded-xl p-3 text-left hover:bg-acc-soft/50 transition-all border border-edge hover:border-acc-edge active:scale-[0.98]"
                >
                  <span className="text-xl mb-1 block">{cat.icon}</span>
                  <span className="text-ink text-sm font-semibold">{cat.name}</span>
                  <span className="text-ink-faint text-xs ml-1">({counts.get(cat.id) ?? 0})</span>
                </button>
              ))}
            </div>
            <p className="text-center text-ink-muted text-xs pt-4">Tap a topic to open its verses, or search above</p>
          </>
        )}
      </div>
    </div>
  );
}
