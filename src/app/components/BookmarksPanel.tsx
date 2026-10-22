'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark as BookmarkIcon, Check, Copy, Trash2 } from 'lucide-react';
import { useBookmarks, type Bookmark } from '@/lib/bookmarks';
import { copyText } from '@/lib/clipboard';

/** Everything the user bookmarked: Bible verses (tap to reopen) and Prayer Verses. */
export default function BookmarksPanel() {
  const router = useRouter();
  const { bookmarks, remove } = useBookmarks();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function handleCopy(b: Bookmark) {
    const suffix = b.translation ? ` (${b.translation})` : '';
    if (await copyText(`"${b.text}" — ${b.reference}${suffix}`)) {
      setCopiedKey(b.key);
      setTimeout(() => setCopiedKey((k) => (k === b.key ? null : k)), 1800);
    }
  }

  function open(b: Bookmark) {
    if (b.kind === 'bible' && b.osis && b.chapter && b.verse) {
      router.push(`/bible/verse/${b.osis}/${b.chapter}/${b.verse}`);
    }
  }

  if (bookmarks.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-edge p-8 text-center">
        <BookmarkIcon className="w-8 h-8 text-ink-faint mx-auto mb-3" />
        <p className="font-bold text-ink text-sm">No bookmarks yet</p>
        <p className="text-xs text-ink-muted mt-1.5 max-w-xs mx-auto">
          Hold any verse for 2 seconds, then tap Bookmark. It will be saved here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[0.6875rem] text-ink-muted">{bookmarks.length} saved {bookmarks.length === 1 ? 'verse' : 'verses'}</p>
      {bookmarks.map((b) => (
        <div key={b.key} className="bg-card rounded-xl border border-edge p-4">
          <div
            className={b.kind === 'bible' ? 'cursor-pointer' : undefined}
            onClick={() => open(b)}
            role={b.kind === 'bible' ? 'link' : undefined}
          >
            <p className="text-acc-strong text-xs font-semibold mb-2">
              {b.reference}
              {b.translation ? <span className="ml-1.5 text-ink-muted font-medium">· {b.translation}</span> : null}
              <span className="ml-1.5 text-ink-faint font-medium">· {b.kind === 'bible' ? 'Bible' : 'Prayer verse'}</span>
            </p>
            <p className="text-ink-soft text-sm leading-relaxed">&ldquo;{b.text}&rdquo;</p>
          </div>
          <div className="flex gap-4 mt-3">
            <button onClick={() => handleCopy(b)} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
              {copiedKey === b.key ? <Check className="w-3 h-3 text-acc" /> : <Copy className="w-3 h-3" />}
              {copiedKey === b.key ? 'Copied' : 'Copy'}
            </button>
            <button onClick={() => remove(b.key)} className="flex items-center gap-1 text-xs text-ink-muted hover:text-danger">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
