'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, ChevronLeft, ChevronRight, Crown, Globe, Headphones, Sparkles, Music, NotebookPen, Podcast, PlayCircle, ScrollText, Siren,
  Timer, Users, BookHeart, type LucideIcon,
} from 'lucide-react';
import { useI18n } from '@/app/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { OPEN_LANGUAGE_EVENT } from './LanguageMenu';
import { cn } from '@/app/utils/cn';

type Feature = { id: string; icon: LucideIcon; name: MessageKey; desc: MessageKey; href?: string; action?: 'language' };

/**
 * Every main feature, newest first, then the older ones. This is the whole list that used to be in the ☰ menu (plus the newer
 * features), so people can find each one from the Home screen. Names and descriptions come from locales/*.json.
 */
export const HOME_FEATURES: Feature[] = [
  { id: 'study', icon: NotebookPen, name: 'feat.study', desc: 'featDesc.study', href: '/study' },
  { id: 'audio', icon: Headphones, name: 'feat.audioBible', desc: 'featDesc.audioBible', href: '/bible' },
  { id: 'verses', icon: ScrollText, name: 'feat.verses', desc: 'featDesc.verses', href: '/prayer-verses' },
  { id: 'language', icon: Globe, name: 'feat.language', desc: 'featDesc.language', action: 'language' },
  { id: 'journal', icon: BookHeart, name: 'feat.journal', desc: 'featDesc.journal', href: '/journal' },
  { id: 'alerts', icon: Siren, name: 'feat.alerts', desc: 'featDesc.alerts', href: '/alerts' },
  { id: 'groups', icon: Users, name: 'feat.groups', desc: 'featDesc.groups', href: '/groups' },
  { id: 'howto', icon: PlayCircle, name: 'feat.howto', desc: 'featDesc.howto', href: '/how-to' },
  { id: 'podcast', icon: Podcast, name: 'feat.podcast', desc: 'featDesc.podcast', href: '/podcast' },
  { id: 'scripture', icon: Sparkles, name: 'feat.scripture', desc: 'featDesc.scripture', href: '/scripture' },
  { id: 'fasting', icon: Timer, name: 'feat.fasting', desc: 'featDesc.fasting', href: '/fasting' },
  { id: 'worship', icon: Music, name: 'feat.worship', desc: 'featDesc.worship', href: '/worship' },
  { id: 'partner', icon: Crown, name: 'feat.partner', desc: 'featDesc.partner', href: '/partner' },
  { id: 'manual', icon: BookOpen, name: 'feat.manual', desc: 'featDesc.manual', href: '/manual' },
];

const CARD = 'shrink-0 snap-start w-[11.5rem] min-h-[5.5rem] flex flex-col gap-1.5 rounded-2xl bg-card border border-edge p-3 text-left active:scale-[0.98] transition-transform';
const ICON = 'grid h-9 w-9 shrink-0 place-items-center rounded-full bg-acc-soft text-acc-strong';
const ARROW = 'absolute top-1/2 -translate-y-1/2 z-10 grid h-9 w-9 place-items-center rounded-full bg-bar text-on-bar shadow-lg ring-1 ring-bar-edge active:scale-95';

/**
 * A row of feature cards you can swipe sideways, or move with the ‹ and › buttons at the edges (the ‹ is hidden at the very start and
 * the › at the very end). A piece of the next card always shows at the edge so people can tell there is more.
 */
export default function HomeFeatureRow() {
  const { t } = useI18n();
  const ref = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro?.disconnect();
    };
  }, [update]);

  const move = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * Math.max(180, ref.current.clientWidth * 0.8), behavior: 'smooth' });

  return (
    <section aria-label={t('row.title')} data-testid="feature-row" className="mt-5">
      <h2 className="text-xs font-bold uppercase tracking-wider text-ink-muted mb-2 px-1">{t('row.title')}</h2>
      <div className="relative">
        {!atStart && (
          <button type="button" onClick={() => move(-1)} aria-label={t('row.prev')} data-testid="feature-prev" className={cn(ARROW, 'left-1')}>
            <ChevronLeft className="w-5 h-5" aria-hidden />
          </button>
        )}
        {!atEnd && (
          <button type="button" onClick={() => move(1)} aria-label={t('row.next')} data-testid="feature-next" className={cn(ARROW, 'right-1')}>
            <ChevronRight className="w-5 h-5" aria-hidden />
          </button>
        )}
        <div
          ref={ref}
          role="list"
          className="flex gap-3 overflow-x-auto snap-x snap-proximity pb-1 pr-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {HOME_FEATURES.map((f) => {
            const Icon = f.icon;
            const inner = (
              <>
                <span className={ICON}>
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
                <span className="block text-[0.9375rem] font-bold leading-tight text-heading">{t(f.name)}</span>
                <span className="block text-xs font-semibold text-ink-muted leading-snug">{t(f.desc)}</span>
              </>
            );
            return f.href ? (
              <Link key={f.id} href={f.href} role="listitem" data-feature={f.id} className={CARD}>
                {inner}
              </Link>
            ) : (
              <button
                key={f.id}
                type="button"
                role="listitem"
                data-feature={f.id}
                onClick={() => window.dispatchEvent(new Event(OPEN_LANGUAGE_EVENT))}
                className={CARD}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
