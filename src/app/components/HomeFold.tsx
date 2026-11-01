import Link from 'next/link';
import { BookOpen, NotebookPen, ScrollText } from 'lucide-react';
import VerseOfTheDayCard from './VerseOfTheDayCard';
import HomeAudioBibleCard from './HomeAudioBibleCard';

const TILE = 'flex min-h-[3.75rem] items-center gap-3 rounded-2xl bg-card border border-edge p-3 active:scale-[0.98] transition-transform';
const ICON = 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ember-tint text-ember-dark';

/**
 * The lower half of the home screen's first view: today's verse (with Listen), then a 2x2 grid of tiles, each going
 * straight to its own page. The Audio Bible tile starts reading aloud where the person stopped.
 */
export default function HomeFold() {
  return (
    <div className="space-y-4" data-testid="home-fold">
      <VerseOfTheDayCard compact />
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <Link href="/bible" className={TILE}>
          <span className={ICON}><BookOpen className="w-5 h-5" /></span>
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-bold leading-tight text-heading">Bible</span>
            <span className="block text-xs font-semibold text-ink-muted">Read or search</span>
          </span>
        </Link>
        <Link href="/prayer-verses" className={TILE}>
          <span className={ICON}><ScrollText className="w-5 h-5" /></span>
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-bold leading-tight text-heading">Prayer Verses</span>
            <span className="block text-xs font-semibold text-ink-muted">Pray by topic</span>
          </span>
        </Link>
        <Link href="/study" className={TILE}>
          <span className={ICON}><NotebookPen className="w-5 h-5" /></span>
          <span className="min-w-0">
            <span className="block text-[0.9375rem] font-bold leading-tight text-heading">My Study</span>
            <span className="block text-xs font-semibold text-ink-muted">Notes &amp; bookmarks</span>
          </span>
        </Link>
        <HomeAudioBibleCard />
      </div>
    </div>
  );
}
