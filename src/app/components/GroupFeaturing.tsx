'use client';

import { useState } from 'react';
import { Check, Clock, Star, X } from 'lucide-react';
import type { GroupDetail } from '@/lib/groups';
import { useI18n } from '@/app/i18n';

type Act = (body: Record<string, unknown>) => Promise<unknown>;

const fmt = (iso: string) => new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });

/** The group leader's "get featured" card: ask, see where the request stands, cancel it. The admin decides. */
export default function GroupFeaturing({ detail, busy, act }: { detail: GroupDetail; busy: boolean; act: Act }) {
  const { t } = useI18n();
  const [message, setMessage] = useState('');
  const f = detail.featuring;
  if (!f) return null;
  const gid = detail.group.id;

  // A leader without an active Leader plan cannot ask, and has nothing to see unless the group is featured or has a request.
  if (f.state === 'none' && !f.canRequest) return null;

  return (
    <div className="bg-card rounded-2xl border border-edge p-3 space-y-2">
      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1"><Star className="w-3 h-3" /> {t('groupFeaturing.featuredGroup')}</p>

      {f.state === 'featured' && (
        <p className="text-sm text-acc-strong font-semibold flex items-start gap-1.5">
          <Check className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Your group is featured{f.until ? ` until ${fmt(f.until)}` : ''}. It appears at the top of the groups list with a badge.</span>
        </p>
      )}

      {f.state === 'pending' && (
        <>
          <p className="text-sm text-ink-soft flex items-start gap-1.5"><Clock className="w-4 h-4 mt-0.5 shrink-0 text-acc-strong" /> <span>{t('groupFeaturing.yourRequestIsWaitingFor')}</span></p>
          <button disabled={busy} onClick={() => act({ action: 'cancelFeaturing', groupId: gid })} className="px-2.5 py-1.5 bg-card-3 text-ink-soft rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-60"><X className="w-3.5 h-3.5" /> {t('groupFeaturing.cancelRequest')}</button>
        </>
      )}

      {f.state === 'rejected' && (
        <p className="text-sm text-ink-soft">
          Your last request was not approved{f.note ? `: "${f.note}"` : '.'}
          {f.retryAfter ? ` You can ask again from ${fmt(f.retryAfter)}.` : ''}
        </p>
      )}

      {f.state === 'none' && f.canRequest && (
        <>
          <p className="text-xs text-ink-muted leading-relaxed">{t('groupFeaturing.featuredGroupsAppearAtThe')}</p>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} maxLength={300} aria-label={t('groupFeaturing.whyShouldYourGroupBe')} placeholder={t('groupFeaturing.tellUsALittleAbout')}
            className="w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint resize-none" />
          <button disabled={busy} onClick={async () => { const r = await act({ action: 'requestFeaturing', groupId: gid, message }); if (r) setMessage(''); }}
            className="px-3 py-2 bg-acc text-on-acc rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-acc-hover disabled:opacity-60"><Star className="w-3.5 h-3.5" /> {t('groupFeaturing.requestToBeFeatured')}</button>
        </>
      )}
    </div>
  );
}
