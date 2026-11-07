'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { LANGUAGES } from '@/lib/i18n/languages';
import { useI18n } from '@/app/i18n';
import { cn } from '@/app/utils/cn';

/** Other screens (the Home feature row) ask the header's language button to open by firing this on `window`. */
export const OPEN_LANGUAGE_EVENT = 'pfm-open-language';

type Variant = 'header' | 'drawer' | 'settings';

/**
 * The "Language" button with a globe icon. One tap opens a short list (English, Français, Español, Português); picking one switches the
 * whole app at once, with no restart, and the choice is saved on the phone. Used in the Home header, the side menu and Settings.
 */
export default function LanguageMenu({ variant }: { variant: Variant }) {
  const { lang, setLang, t } = useI18n();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // The Home "Language" card opens the header's button.
  useEffect(() => {
    if (variant !== 'header') return;
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_LANGUAGE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_LANGUAGE_EVENT, onOpen);
  }, [variant]);

  const pick = (code: (typeof LANGUAGES)[number]['code']) => {
    setLang(code);
    setOpen(false);
  };

  const list = (
    <ul role="listbox" aria-label={t('language.choose')} className="py-1">
      {LANGUAGES.map((l) => {
        const chosen = l.code === lang;
        return (
          <li key={l.code} role="option" aria-selected={chosen}>
            <button
              type="button"
              lang={l.code}
              onClick={() => pick(l.code)}
              className={cn(
                'w-full flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                variant === 'drawer'
                  ? chosen ? 'bg-bar-hover text-on-bar font-bold' : 'text-on-bar/90 hover:bg-bar-hover'
                  : chosen ? 'bg-acc-soft text-acc-strong font-bold' : 'text-ink-soft hover:bg-card-2'
              )}
            >
              {l.native}
              {chosen && <Check className="w-4 h-4 shrink-0" aria-hidden />}
            </button>
          </li>
        );
      })}
    </ul>
  );

  if (variant === 'header') {
    return (
      <div className="relative" ref={boxRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={`${t('language.button')}: ${current.native}`}
          title={t('language.button')}
          data-testid="language-button"
          className="flex items-center gap-1 px-2 py-2 hover:bg-bar-hover rounded-full transition-colors text-on-bar"
        >
          <Globe className="w-5 h-5" aria-hidden />
          <span className="text-xs font-bold uppercase leading-none">{current.code}</span>
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-card text-ink border border-edge rounded-2xl shadow-xl overflow-hidden z-50">
            <p className="px-4 pt-3 pb-1 text-[0.6875rem] font-bold uppercase tracking-wider text-ink-muted">{t('language.button')}</p>
            {list}
          </div>
        )}
      </div>
    );
  }

  const dark = variant === 'drawer';
  return (
    <div ref={boxRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        data-testid={`language-${variant}`}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors',
          dark ? 'text-on-bar hover:bg-bar-hover' : 'bg-card-2 border border-edge text-ink-soft hover:bg-card-3'
        )}
      >
        <Globe className={cn('w-5 h-5 shrink-0', dark ? 'text-on-bar' : 'text-acc-strong')} aria-hidden />
        <span className="flex-1 text-sm font-semibold">{t('language.button')}</span>
        <span className={cn('text-sm', dark ? 'text-on-bar/80' : 'text-ink-muted')}>{current.native}</span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className={cn('mt-1 rounded-xl overflow-hidden', dark ? 'bg-black/25 border border-bar-edge' : 'border border-edge bg-card')}>{list}</div>
      )}
    </div>
  );
}
