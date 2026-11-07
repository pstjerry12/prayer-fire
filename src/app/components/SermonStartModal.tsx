'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { startSermon, todayISO } from '@/lib/study';
import { useI18n } from '@/app/i18n';

interface Props {
  onClose: () => void;
  /** Called with the new sermon's id once it has been created and made active. */
  onStarted: (sermonId: string) => void;
}

/** "Start a Sermon Session": title, preacher and date. */
export default function SermonStartModal({ onClose, onStarted }: Props) {
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [preacher, setPreacher] = useState('');
  const [date, setDate] = useState(todayISO());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onStarted(startSermon({ title, preacher, date }));
  }

  return (
    <div className="fixed inset-0 z-[88] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label={t('sermonStartModal.startASermonSession2')}>
      <button aria-label={t('authModal.close')} className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full sm:max-w-sm bg-card rounded-t-3xl sm:rounded-3xl border border-edge shadow-2xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-serif-heading text-lg font-bold text-ink">{t('sermonStartModal.startASermonSession')}</h2>
          <button type="button" onClick={onClose} aria-label={t('authModal.close')} className="p-1.5 rounded-full text-ink-muted hover:bg-card-3">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-ink-muted">{t('sermonStartModal.everyVerseYouAddTo')}</p>

        <label className="block">
          <span className="text-xs font-semibold text-ink-soft">{t('sermonStartModal.sermonTitle')}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder={t('sermonStartModal.eGFaithThatMoves')}
            className="mt-1 w-full bg-card border border-edge-strong rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-acc-hover/40"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-soft">{t('sermonStartModal.preacher')}</span>
          <input
            value={preacher}
            onChange={(e) => setPreacher(e.target.value)}
            maxLength={200}
            placeholder={t('sermonStartModal.eGPastorJerry')}
            className="mt-1 w-full bg-card border border-edge-strong rounded-xl px-3 py-2.5 text-sm text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-acc-hover/40"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-soft">{t('sermonStartModal.date')}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full bg-card border border-edge-strong rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-acc-hover/40"
          />
        </label>

        <button type="submit" className="w-full py-3 bg-acc text-on-acc rounded-xl font-bold hover:bg-acc-hover active:scale-[0.99]">{t('sermonStartModal.startSession')}</button>
      </form>
    </div>
  );
}
