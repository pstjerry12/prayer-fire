'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, CornerDownRight, X, Loader2 } from 'lucide-react';
import { loadTranslation } from '@/lib/bible/loadTranslation';
import { parseReferenceInput } from '@/lib/bible/reference';
import { searchBible, searchWords, type SearchHit } from '@/lib/bible/search';
import type { TranslationId } from '@/lib/bible/translations';

interface Props {
  translationId: TranslationId;
  /** Open this chapter (and select this verse, when given). */
  onGoTo: (target: { osis: string; chapter: number; verse: number | null }) => void;
}

function Snippet({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0) return <>{text}</>;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        words.includes(part.toLowerCase()) ? (
          <mark key={i} className="bg-[var(--hl-bookmark)] text-inherit rounded px-0.5">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

/** One box for both: type "John 3:16" to jump straight there, or words to search the whole Bible. */
export default function BibleSearchBar({ translationId, onGoTo }: Props) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [result, setResult] = useState<{ query: string; translationId: string; hits: SearchHit[]; more: boolean } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  const parsed = useMemo(() => parseReferenceInput(query), [query]);
  const words = useMemo(() => searchWords(debounced), [debounced]);
  const wantsSearch = !parsed && words.length > 0 && !(words.length === 1 && words[0].length < 2);

  useEffect(() => {
    if (!wantsSearch) return;
    let cancelled = false;
    loadTranslation(translationId)
      .then((data) => {
        if (cancelled) return;
        const { hits, more } = searchBible(data, debounced);
        setFailed(false);
        setResult({ query: debounced, translationId, hits, more });
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [wantsSearch, debounced, translationId]);

  const fresh = wantsSearch && result && result.query === debounced && result.translationId === translationId ? result : null;

  function go(target: { osis: string; chapter: number; verse: number | null }) {
    setQuery('');
    setDebounced('');
    setResult(null);
    onGoTo(target);
  }

  const showPanel = query.trim().length > 0;

  return (
    <div className="bg-card rounded-2xl border border-edge px-4 py-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (parsed) go({ osis: parsed.book.osis, chapter: parsed.chapter ?? 1, verse: parsed.verse });
        }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the Bible, or jump to John 3:16"
          aria-label="Search the Bible or jump to a verse"
          enterKeyHint="go"
          className="w-full bg-card-2 border border-edge-strong rounded-xl pl-10 pr-10 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-ink-muted hover:bg-card-3">
            <X className="w-4 h-4" />
          </button>
        )}
      </form>

      {showPanel && (
        <div className="mt-3 space-y-2 max-h-[50vh] overflow-y-auto">
          {parsed && (
            <button
              onClick={() => go({ osis: parsed.book.osis, chapter: parsed.chapter ?? 1, verse: parsed.verse })}
              className="w-full flex items-center gap-2 rounded-xl bg-acc-soft text-acc-strong px-3 py-2.5 text-sm font-bold text-left"
            >
              <CornerDownRight className="w-4 h-4 shrink-0" />
              Go to {parsed.book.name}
              {parsed.chapter ? ` ${parsed.chapter}` : ''}
              {parsed.verse ? `:${parsed.verse}` : ''}
            </button>
          )}
          {wantsSearch && !fresh && !failed && (
            <p className="flex items-center gap-2 text-xs text-ink-muted py-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching…
            </p>
          )}
          {failed && <p className="text-xs text-ink-muted py-2">Search isn&apos;t available right now.</p>}
          {fresh && fresh.hits.length === 0 && <p className="text-xs text-ink-muted py-2">No verses contain all of those words.</p>}
          {fresh?.hits.map((h) => (
            <button
              key={`${h.osis}-${h.chapter}-${h.verse}`}
              onClick={() => go({ osis: h.osis, chapter: h.chapter, verse: h.verse })}
              className="w-full text-left rounded-xl border border-edge px-3 py-2.5 hover:bg-card-2 active:bg-card-2"
            >
              <p className="text-xs font-bold text-acc-strong">
                {h.book} {h.chapter}:{h.verse}
              </p>
              <p className="text-sm text-ink-soft leading-snug mt-0.5">
                <Snippet text={h.text} words={searchWords(fresh.query)} />
              </p>
            </button>
          ))}
          {fresh?.more && <p className="text-[0.6875rem] text-ink-muted text-center py-1">Showing the first {fresh.hits.length} verses. Add more words to narrow it down.</p>}
        </div>
      )}
    </div>
  );
}
