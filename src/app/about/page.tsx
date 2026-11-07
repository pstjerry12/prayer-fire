'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Info } from 'lucide-react';
import Navbar from '@/app/components/Navbar';
import Footer from '@/app/components/Footer';
import { useI18n } from '@/app/i18n';
import { getAppVersionInfo } from '@/lib/capacitorAlarm';
import { CONTACT_EMAIL, DELETE_ACCOUNT_PATH } from '@/app/data/legal';

/** About Prayer Fire: what it is, which version this is, how to reach us, and the legal pages. Public (no sign-in needed). */
export default function AboutPage() {
  const { t } = useI18n();
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    getAppVersionInfo().then((v) => setVersion(v ? `${v.version} (${v.build})` : null));
  }, []);

  return (
    <>
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-6 pb-28 md:pb-10">
        <Link href="/" className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-acc-strong mb-4">
          <ChevronLeft className="w-4 h-4" /> {t('common.home')}
        </Link>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl bg-acc-soft flex items-center justify-center">
            <Info className="w-6 h-6 text-acc-strong" />
          </div>
          <h1 className="font-serif-heading text-2xl font-bold text-ink">{t('about.title')}: {t('app.name')}</h1>
        </div>

        <div className="bg-card rounded-2xl border border-edge p-5 space-y-3">
          <p className="text-ink-soft text-sm leading-relaxed">{t('about.intro')}</p>
          <p className="text-ink-soft text-sm leading-relaxed">{t('about.mission')}</p>
          <p className="text-ink-muted text-xs">{t('about.operatedBy')}</p>
          {version && (
            <p className="text-ink-muted text-xs">
              {t('about.version')}: {version}
            </p>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-edge p-5 mt-4 space-y-2">
          <h2 className="font-serif-heading text-base font-bold text-ink">{t('about.contactUs')}</h2>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-acc-strong font-semibold text-sm underline">{CONTACT_EMAIL}</a>
        </div>

        <div className="bg-card rounded-2xl border border-edge p-5 mt-4">
          <h2 className="font-serif-heading text-base font-bold text-ink mb-2">{t('about.legal')}</h2>
          <ul className="space-y-1.5 text-sm">
            <li><Link href="/privacy" className="text-acc-strong font-semibold underline">{t('legal.privacy')}</Link></li>
            <li><Link href="/terms" className="text-acc-strong font-semibold underline">{t('legal.terms')}</Link></li>
            <li><Link href="/community-guidelines" className="text-acc-strong font-semibold underline">{t('legal.guidelines')}</Link></li>
            <li><Link href={DELETE_ACCOUNT_PATH} className="text-acc-strong font-semibold underline">{t('legal.deleteAccount')}</Link></li>
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
