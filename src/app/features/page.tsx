'use client';

import Link from 'next/link';
import { ChevronLeft, ChevronRight, LayoutGrid } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { useApp } from '@/app/context';
import { useI18n } from '@/app/i18n';
import { APP_FEATURES } from './featureList';

// Same look as the cards on Home: soft card, light border, round green icon.
const CARD = 'flex items-center gap-3 rounded-2xl bg-card border border-edge p-3.5 text-left w-full active:scale-[0.98] transition-transform hover:border-edge-strong';
const ICON = 'grid h-11 w-11 shrink-0 place-items-center rounded-full bg-acc-soft text-acc-strong';

/** Every feature of the app in one list: icon, name and a short description; tapping one opens it. */
export default function FeaturesPage() {
  const { t } = useI18n();
  const { setShowSettings } = useApp();

  return (
    <>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong mb-4">
          <ChevronLeft className="w-4 h-4" /> {t('common.home')}
        </Link>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center shrink-0">
            <LayoutGrid className="w-6 h-6 text-acc-strong" aria-hidden />
          </div>
          <h1 className="font-serif-heading text-2xl font-bold text-ink">{t('features.title')}</h1>
        </div>
        <p className="text-ink-muted text-sm mb-5">{t('features.subtitle')}</p>

        <ul data-testid="features-list" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {APP_FEATURES.map((f) => {
            const Icon = f.icon;
            const inner = (
              <>
                <span className={ICON}>
                  <Icon className="w-5 h-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[0.9375rem] font-bold leading-tight text-heading">{t(f.name)}</span>
                  <span className="block text-xs font-semibold text-ink-muted leading-snug mt-0.5">{t(f.desc)}</span>
                </span>
                <ChevronRight className="w-4 h-4 shrink-0 text-ink-faint" aria-hidden />
              </>
            );
            return (
              <li key={f.id}>
                {f.href ? (
                  <Link href={f.href} data-feature={f.id} className={CARD}>
                    {inner}
                  </Link>
                ) : (
                  <button type="button" data-feature={f.id} onClick={() => setShowSettings(true)} className={CARD}>
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </main>
      <Footer />
    </>
  );
}
