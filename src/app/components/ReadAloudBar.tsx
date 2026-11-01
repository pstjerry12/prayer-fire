'use client';

import { Pause, Play, Square } from 'lucide-react';
import type { ReaderState } from '@/lib/readAloud';

interface Props {
  state: ReaderState;
  /** "Reading John 3:16" */
  label: string;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

/** The small floating player shown while something is being read aloud. */
export default function ReadAloudBar({ state, label, onPause, onResume, onStop }: Props) {
  if (state === 'idle') return null;
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[60] bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-6 w-[calc(100%-1.5rem)] max-w-md"
      role="region"
      aria-label="Read aloud player"
    >
      <div className="flex items-center gap-3 bg-card border border-edge-strong shadow-2xl rounded-2xl pl-4 pr-2 py-2">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          {state === 'playing' && <span className="absolute inline-flex h-full w-full rounded-full bg-acc opacity-70 animate-ping" />}
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-acc" />
        </span>
        <p className="flex-1 min-w-0 truncate text-sm font-bold text-ink">{state === 'paused' ? `Paused · ${label}` : label}</p>
        <button
          onClick={state === 'playing' ? onPause : onResume}
          aria-label={state === 'playing' ? 'Pause' : 'Resume'}
          className="grid h-10 w-10 place-items-center rounded-xl bg-acc text-on-acc active:scale-95"
        >
          {state === 'playing' ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
        </button>
        <button onClick={onStop} aria-label="Stop" className="grid h-10 w-10 place-items-center rounded-xl bg-card-2 text-ink-soft hover:bg-card-3 active:scale-95">
          <Square className="w-4 h-4 fill-current" />
        </button>
      </div>
    </div>
  );
}
