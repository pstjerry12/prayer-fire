'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cleanUnitId } from '@/lib/adsRules';

/**
 * Admin -> Pricing -> Ads: switch the Home banner on or off and set its AdMob banner ad unit id. Ads stay OFF until this is turned on,
 * which should only happen after the real AdMob ids are set up (see PROJECT_HANDOFF.md, Ads). Saved in app_settings.
 */
export default function AdminAds() {
  const [enabled, setEnabled] = useState(false);
  const [unit, setUnit] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/admin/settings', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setEnabled(d.settings?.ads_enabled === 'true');
        setUnit(d.settings?.ads_banner_unit ?? '');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const unitOk = unit.trim() === '' || cleanUnitId(unit) !== '';

  async function save() {
    if (!unitOk) return setMessage({ kind: 'error', text: 'The ad unit id looks like ca-app-pub-1234567890123456/1234567890. Check it in AdMob.' });
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ads_enabled: enabled ? 'true' : 'false', ads_banner_unit: unit.trim() }) });
      if (!res.ok) throw new Error(String(res.status));
      setMessage({ kind: 'ok', text: enabled ? (unit.trim() ? 'Saved. Ads are ON with your real ad unit.' : 'Saved. Ads are ON in TEST mode (test ads only, no earnings) because no ad unit id is set.') : 'Saved. Ads are OFF.' });
    } catch {
      setMessage({ kind: 'error', text: 'Could not save. Check your connection.' });
    }
    setBusy(false);
  }

  if (!loaded) return <div className="flex justify-center py-6 text-ink-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  return (
    <section className="rounded-2xl border border-edge bg-card p-4 sm:p-5 space-y-3" aria-label="Ads">
      <div>
        <h3 className="font-bold text-ink">Ads (Google AdMob)</h3>
        <p className="text-ink-muted text-xs mt-1">One small banner on the Home screen of the Android app, nowhere else. Never shown to Partner or Leader subscribers, during Free Premium Mode, or on prayer, Bible, read-aloud or alarm screens. Off until you turn it on.</p>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-ink">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} aria-label="Show ads" /> Show the Home banner ad
      </label>
      <label className="block text-xs text-ink-muted">Banner ad unit id (from AdMob)
        <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="ca-app-pub-1234567890123456/1234567890" aria-label="Banner ad unit id" maxLength={60}
          className="mt-1 w-full rounded-lg border border-edge-strong bg-card-2 px-3 py-2 text-sm text-ink" />
      </label>
      {!unitOk && <p className="text-danger text-xs">That does not look like an ad unit id.</p>}
      <p className="text-ink-faint text-[0.6875rem] leading-relaxed">If you turn ads on with the id empty, only Google&apos;s TEST ads show (no earnings). The app also needs your real AdMob <strong>app</strong> id, set once as the GitHub secret ADMOB_APP_ID before the next Android build. Steps are in PROJECT_HANDOFF.md, Ads.</p>
      {message && <p role="status" className={message.kind === 'ok' ? 'text-sm text-acc-strong bg-acc-soft border border-acc-edge rounded-xl p-3' : 'text-sm text-danger bg-danger-soft border border-danger-edge rounded-xl p-3'}>{message.text}</p>}
      <button onClick={save} disabled={busy} className="w-full py-2.5 rounded-xl bg-acc text-on-acc font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save ad settings</button>
    </section>
  );
}
