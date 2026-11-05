'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, RotateCcw } from 'lucide-react';
import {
  DEFAULT_PLAN_CONFIG, featuresToText, parsePlanConfig, textToFeatures, type LeaderTier, type PlanConfig,
} from '@/lib/planConfig';

type PlanKey = 'free' | 'partner' | 'leader';
const PLAN_LABEL: Record<PlanKey, string> = { free: 'Free', partner: 'Partner', leader: 'Leader' };

/**
 * Admin -> Pricing -> "Plans and Leader tiers": what each plan says it includes, and the Leader tiers with their member
 * limits. Saved as JSON in app_settings (`plan_config`); no code change needed. Prices are not here (Google Play).
 */
export default function AdminPlans() {
  const [config, setConfig] = useState<PlanConfig>(DEFAULT_PLAN_CONFIG);
  const [texts, setTexts] = useState<Record<PlanKey, string>>({ free: '', partner: '', leader: '' });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function apply(next: PlanConfig) {
    setConfig(next);
    setTexts({ free: featuresToText(next.free.features), partner: featuresToText(next.partner.features), leader: featuresToText(next.leader.features) });
  }

  useEffect(() => {
    fetch('/api/plan-config', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => apply(parsePlanConfig(d.config)))
      .catch(() => apply(DEFAULT_PLAN_CONFIG))
      .finally(() => setLoaded(true));
  }, []);

  function setCopy(plan: PlanKey, field: 'name' | 'tagline', value: string) {
    setConfig((c) => ({ ...c, [plan]: { ...c[plan], [field]: value } }));
  }

  function setTier(i: number, patch: Partial<LeaderTier>) {
    setConfig((c) => ({ ...c, leaderTiers: c.leaderTiers.map((t, n) => (n === i ? { ...t, ...patch } : t)) }));
  }

  async function save(next?: PlanConfig) {
    setBusy(true);
    setMessage(null);
    const toSave = parsePlanConfig(
      next ?? {
        ...config,
        free: { ...config.free, features: textToFeatures(texts.free) },
        partner: { ...config.partner, features: textToFeatures(texts.partner) },
        leader: { ...config.leader, features: textToFeatures(texts.leader) },
      }
    );
    try {
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan_config: JSON.stringify(toSave) }) });
      if (!res.ok) throw new Error(String(res.status));
      apply(toSave);
      setMessage('Saved. The plans page shows this within a minute or two.');
    } catch {
      setMessage('Could not save. Check your connection and try again.');
    }
    setBusy(false);
  }

  if (!loaded) {
    return (
      <div className="flex justify-center py-6 text-ink-muted">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-edge bg-card p-4 sm:p-5 space-y-5" aria-label="Plans and Leader tiers">
      <div>
        <h3 className="font-bold text-ink">Plans and Leader tiers</h3>
        <p className="text-ink-muted text-xs mt-1">
          Change what each plan says it includes and the Leader member limits. Prices are set in Google Play (Play Console), and
          &quot;Premium free for a period&quot; is the Free Premium Mode card below.
        </p>
      </div>

      {(['free', 'partner', 'leader'] as const).map((plan) => (
        <div key={plan} className="space-y-2">
          <h4 className="font-bold text-ink text-sm">{PLAN_LABEL[plan]} plan</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-xs text-ink-muted">
              Name
              <input value={config[plan].name} onChange={(e) => setCopy(plan, 'name', e.target.value)} maxLength={40}
                className="mt-1 w-full rounded-lg border border-edge-strong bg-card-2 px-3 py-2 text-sm text-ink" />
            </label>
            <label className="text-xs text-ink-muted">
              One-line description
              <input value={config[plan].tagline} onChange={(e) => setCopy(plan, 'tagline', e.target.value)} maxLength={120}
                className="mt-1 w-full rounded-lg border border-edge-strong bg-card-2 px-3 py-2 text-sm text-ink" />
            </label>
          </div>
          <label className="block text-xs text-ink-muted">
            What it includes (one per line; start a line with [soon] to show a &quot;Soon&quot; tag)
            <textarea value={texts[plan]} onChange={(e) => setTexts((t) => ({ ...t, [plan]: e.target.value }))} rows={6}
              className="mt-1 w-full rounded-lg border border-edge-strong bg-card-2 px-3 py-2 text-sm text-ink font-sans" />
          </label>
        </div>
      ))}

      <div className="space-y-2">
        <h4 className="font-bold text-ink text-sm">Leader tiers (member limits)</h4>
        <p className="text-ink-muted text-xs">
          A tier is only for sale once it is marked Available <strong>and</strong> you have created its subscription in Google Play
          and its entitlement in RevenueCat (use the same entitlement name). Until then it shows as &quot;Coming soon&quot;. The
          existing Leader subscription uses the entitlement <code>leader</code>.
        </p>
        {config.leaderTiers.map((t, i) => (
          <div key={t.id} className="grid gap-2 sm:grid-cols-[1.4fr_1fr_1.2fr_auto] items-end rounded-xl border border-edge p-3">
            <label className="text-xs text-ink-muted">
              Name
              <input value={t.name} onChange={(e) => setTier(i, { name: e.target.value })} maxLength={40}
                className="mt-1 w-full rounded-lg border border-edge-strong bg-card-2 px-3 py-2 text-sm text-ink" />
            </label>
            <label className="text-xs text-ink-muted">
              Member limit
              <input type="number" min={1} max={100000} value={t.memberLimit} onChange={(e) => setTier(i, { memberLimit: Number(e.target.value) })}
                className="mt-1 w-full rounded-lg border border-edge-strong bg-card-2 px-3 py-2 text-sm text-ink" />
            </label>
            <label className="text-xs text-ink-muted">
              RevenueCat entitlement
              <input value={t.entitlement} onChange={(e) => setTier(i, { entitlement: e.target.value })} maxLength={40}
                className="mt-1 w-full rounded-lg border border-edge-strong bg-card-2 px-3 py-2 text-sm text-ink" />
            </label>
            <label className="flex items-center gap-2 text-xs font-semibold text-ink pb-2">
              <input type="checkbox" checked={t.available} onChange={(e) => setTier(i, { available: e.target.checked })} /> Available
            </label>
          </div>
        ))}
      </div>

      {message && <p role="status" className="text-sm text-ink-soft bg-card-2 border border-edge rounded-xl p-3">{message}</p>}

      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={() => save()} disabled={busy} className="flex-1 py-2.5 rounded-xl bg-acc text-on-acc font-bold text-sm hover:bg-acc-hover disabled:opacity-60 flex items-center justify-center gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save plans
        </button>
        <button onClick={() => save(DEFAULT_PLAN_CONFIG)} disabled={busy} className="py-2.5 px-4 rounded-xl border border-edge-strong text-ink-soft font-bold text-sm hover:bg-card-2 disabled:opacity-60 flex items-center justify-center gap-2">
          <RotateCcw className="w-4 h-4" /> Reset to defaults
        </button>
      </div>
    </section>
  );
}
