'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Flame, Play, Square } from 'lucide-react';
import { cn } from '../utils/cn';
import { openingPrayerFor } from '@/app/data/openingPrayers';
import { useReadAloud } from '@/lib/useReadAloud';

/**
 * Home screen: today's opening prayer for the Start-Up Prayer. Two or three lines show; tap the text to read all of it,
 * and the play button reads it aloud (with the phone's own voice, so it works without internet).
 */
export default function HomeStartUpCard() {
  const reader = useReadAloud();
  const prayer = useMemo(() => openingPrayerFor(), []);
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-2xl border border-acc-edge bg-card pl-3 pr-1.5 pt-1.5 pb-2.5 shadow-sm" aria-label="Start-Up Prayer">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex-1 min-h-11 flex items-center gap-1.5 text-left text-[0.6875rem] font-bold uppercase tracking-wider text-acc-strong"
        >
          <Flame className="w-3.5 h-3.5 shrink-0" /> Start-Up Prayer
          <span className="normal-case tracking-normal font-semibold text-ink-muted ml-1 flex items-center gap-0.5">
            {open ? 'Show less' : 'Tap to read all'} {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </button>
        <button
          onClick={() => (reader.reading ? reader.stop() : reader.start([{ id: 'opening', text: prayer }]))}
          aria-label={reader.reading ? 'Stop reading the opening prayer' : "Read today's opening prayer aloud"}
          className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-full text-white active:scale-95', reader.reading ? 'bg-ink' : 'bg-emerald-600 hover:bg-emerald-500')}
        >
          {reader.reading ? <Square className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>
      </div>
      <button onClick={() => setOpen(!open)} aria-label="Today's opening prayer" className="block w-full text-left -mt-1 pr-1.5">
        <p className={cn('text-sm leading-snug text-ink-soft', !open && 'line-clamp-3')}>{prayer}</p>
      </button>
      {open && (
        <Link href="/startup" className="mt-2 mr-1.5 flex h-11 items-center justify-center rounded-xl bg-emerald-600 text-white text-sm font-bold active:scale-95">
          Begin the 7-step Start-Up Prayer
        </Link>
      )}
    </section>
  );
}
