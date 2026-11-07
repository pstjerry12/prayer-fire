'use client';

import SocialLinks from './SocialLinks';
import { useI18n } from '@/app/i18n';

export default function Footer() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-edge mt-8 bg-card pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto px-4 py-6 text-center">
        <div className="flex items-center justify-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-danger-soft ring-1 ring-danger-edge overflow-hidden">
            <img src="/logo-sm.png" width={192} height={192} decoding="async" alt={t('app.name')} className="w-full h-full object-cover" />
          </span>
          <span className="text-ink font-serif font-bold text-sm">{t('app.name')}</span>
        </div>

        <p className="text-ink-muted text-[0.6875rem] mt-2">{t('footer.writeItSpeakItPray')}</p>
        <p className="text-ink-faint text-[0.625rem] mt-1">{t('bottomNav.pastorJerryC')}</p>

        <SocialLinks />

        <nav aria-label={t('about.legal')} className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[0.6875rem] text-ink-muted">
          <a href="/privacy" className="underline hover:text-acc-strong">{t('footer.privacy')}</a>
          <a href="/terms" className="underline hover:text-acc-strong">{t('footer.terms')}</a>
          <a href="/community-guidelines" className="underline hover:text-acc-strong">{t('legal.guidelines')}</a>
          <a href="/delete-account" className="underline hover:text-acc-strong">{t('legal.deleteAccount')}</a>
        </nav>
      </div>
    </footer>
  );
}
