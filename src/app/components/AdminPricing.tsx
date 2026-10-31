'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, Gift, Loader2, RefreshCw, Tag } from 'lucide-react';
import { cn } from '@/app/utils/cn';

interface PriceRow { regionCode: string; currencyCode: string; priceMicros: string }
interface BasePlanSummary { basePlanId: string; state: string | null; billingPeriod: string | null; prices: PriceRow[] }
interface ProductSummary { productId: string; basePlans: BasePlanSummary[]; error?: string }
interface Preview { productId: string; basePlanId: string; regionCode: string; currencyCode: string; oldPriceMicros: string; newPriceMicros: string; direction: 'increase' | 'decrease' | 'same' }
interface PriceLog { id: string; adminEmail: string | null; productId: string; basePlanId: string; regionCode: string; currencyCode: string; oldPriceMicros: string | null; newPriceMicros: string; appliedToExisting: boolean; result: string; errorMessage: string | null; createdAt: string }
interface ActionLog { id: string; adminEmail: string | null; action: string; details: Record<string, unknown> | null; result: string; createdAt: string }
interface OfferRow { productId: string; basePlanId: string; offerId: string; state: string; description: string }
interface FreeSettings { enabled: boolean; start: string | null; end: string | null; existing: 'keep' | 'defer' }

const MAIN_REGIONS = ['NG', 'US', 'OTHER_USD', 'OTHER_EUR'];

const PRODUCT_NAMES: Record<string, string> = { partner_sub: 'Partner', leader_sub: 'Leader' };

function money(micros: string | null, currency: string): string {
  if (micros === null) return '-';
  let value: number;
  try {
    value = Number(BigInt(micros)) / 1_000_000;
  } catch {
    return '-';
  }
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}

function regionLabel(code: string): string {
  if (code === 'OTHER_USD') return 'All other countries (USD)';
  if (code === 'OTHER_EUR') return 'All other countries (EUR)';
  try {
    const name = new Intl.DisplayNames(undefined, { type: 'region' }).of(code);
    return name ? `${name} (${code})` : code;
  } catch {
    return code;
  }
}

function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function billing<T>(body: Record<string, unknown>): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch('/api/admin/billing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    return res.ok ? { ok: true, data } : { ok: false, error: data?.error || `Something went wrong (${res.status}).` };
  } catch {
    return { ok: false, error: 'Could not reach the server.' };
  }
}

/** Admin → Pricing: Google Play prices, Free Premium Mode, deferring billing, and the log of every change. */
export default function AdminPricing() {
  // ── Prices ────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<ProductSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<{ productId: string; basePlanId: string; regionCode: string } | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [applyExisting, setApplyExisting] = useState(false);
  const [busy, setBusy] = useState<null | 'load' | 'preview' | 'apply' | 'free' | 'deferPreview' | 'deferRun' | 'offers' | 'offerCreate' | string>(null);
  const [priceMsg, setPriceMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  // ── Free mode ────────────────────────────────────────────────────────
  const [free, setFree] = useState<FreeSettings>({ enabled: false, start: null, end: null, existing: 'keep' });
  const [freeNow, setFreeNow] = useState<{ active: boolean; endsAt: string | null } | null>(null);
  const [freeMsg, setFreeMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [deferDays, setDeferDays] = useState('30');
  const [includeSandbox, setIncludeSandbox] = useState(false);
  const [deferInfo, setDeferInfo] = useState<string | null>(null);

  // ── Offers ───────────────────────────────────────────────────────────
  const [offers, setOffers] = useState<OfferRow[] | null>(null);
  const [offerMsg, setOfferMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [offerForm, setOfferForm] = useState({ plan: '', offerId: '', kind: 'discount' as 'discount' | 'trial', percentOff: '50', periods: '1', days: '7' });

  // ── Log ───────────────────────────────────────────────────────────────
  const [prices, setPrices] = useState<PriceLog[]>([]);
  const [actions, setActions] = useState<ActionLog[]>([]);

  const loadPrices = useCallback(async () => {
    setBusy('load');
    setLoadError(null);
    const r = await billing<{ products: ProductSummary[] }>({ action: 'pricing.list' });
    if (r.ok) setProducts(r.data.products);
    else setLoadError(r.error);
    setBusy(null);
  }, []);

  const loadFree = useCallback(async () => {
    const res = await fetch('/api/admin/billing/free-mode');
    if (!res.ok) return;
    const data = await res.json();
    setFree(data.settings);
    setFreeNow(data.current);
  }, []);

  const loadLog = useCallback(async () => {
    const res = await fetch('/api/admin/billing/log');
    if (!res.ok) return;
    const data = await res.json();
    setPrices(data.prices);
    setActions(data.actions);
  }, []);

  const loadOffers = useCallback(async () => {
    setBusy('offers');
    const r = await billing<{ offers: OfferRow[]; problems: string[] }>({ action: 'offers.list' });
    if (r.ok) {
      setOffers(r.data.offers);
      if (r.data.problems.length) setOfferMsg({ kind: 'error', text: r.data.problems.join(' ') });
    } else {
      setOfferMsg({ kind: 'error', text: r.error });
    }
    setBusy(null);
  }, []);

  useEffect(() => {
    // Initial load of everything on this screen.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadPrices();
    loadFree();
    loadLog();
    loadOffers();
  }, [loadPrices, loadFree, loadLog, loadOffers]);

  const currentRow = useMemo(() => {
    if (!editing || !products) return null;
    return products.find((p) => p.productId === editing.productId)?.basePlans.find((b) => b.basePlanId === editing.basePlanId)?.prices.find((r) => r.regionCode === editing.regionCode) ?? null;
  }, [editing, products]);

  function startEdit(productId: string, basePlanId: string, row: PriceRow) {
    setEditing({ productId, basePlanId, regionCode: row.regionCode });
    setPriceInput((Number(BigInt(row.priceMicros)) / 1_000_000).toString());
    setPreview(null);
    setApplyExisting(false);
    setPriceMsg(null);
  }

  async function runPreview() {
    if (!editing) return;
    setBusy('preview');
    setPriceMsg(null);
    setPreview(null);
    const r = await billing<Preview>({ action: 'pricing.preview', ...editing, price: priceInput });
    if (r.ok) setPreview(r.data);
    else setPriceMsg({ kind: 'error', text: r.error });
    setBusy(null);
  }

  async function applyPrice() {
    if (!editing || !preview) return;
    const label = `${PRODUCT_NAMES[editing.productId] ?? editing.productId} / ${editing.basePlanId} / ${regionLabel(editing.regionCode)}`;
    const sentence = `${money(preview.oldPriceMicros, preview.currencyCode)} → ${money(preview.newPriceMicros, preview.currencyCode)}`;
    if (!confirm(`Change the price in Google Play?\n\n${label}\n${sentence}\n\nNew subscribers will pay this price straight away.`)) return;
    setBusy('apply');
    const r = await billing<{ ok: true; migration: string | null }>({ action: 'pricing.update', ...editing, price: priceInput, applyToExisting: applyExisting });
    if (r.ok) {
      setPriceMsg({ kind: 'ok', text: `Saved in Google Play: ${sentence}.${r.data.migration ? ` ${r.data.migration}` : ''}` });
      setEditing(null);
      setPreview(null);
      await Promise.all([loadPrices(), loadLog()]);
    } else {
      setPriceMsg({ kind: 'error', text: r.error });
      loadLog();
    }
    setBusy(null);
  }

  async function saveFree(next: FreeSettings) {
    setBusy('free');
    setFreeMsg(null);
    const res = await fetch('/api/admin/billing/free-mode', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) });
    const data = await res.json();
    if (res.ok) {
      setFree(data.settings);
      setFreeNow(data.current);
      setFreeMsg({ kind: 'ok', text: next.enabled ? 'Free Premium Mode is saved.' : 'Free Premium Mode is off.' });
      loadLog();
    } else {
      setFreeMsg({ kind: 'error', text: data.error || 'Could not save.' });
    }
    setBusy(null);
  }

  // The deferral length defaults to the length of the free period.
  useEffect(() => {
    if (!free.end) return;
    const from = free.start && Date.parse(free.start) > Date.now() ? Date.parse(free.start) : Date.now();
    const days = Math.ceil((Date.parse(free.end) - from) / 86_400_000);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (days >= 1 && days <= 365) setDeferDays(String(days));
  }, [free.start, free.end]);

  async function deferPreview() {
    setBusy('deferPreview');
    setDeferInfo(null);
    const r = await billing<{ eligible: number; skipped: number; days: number }>({ action: 'defer.preview', days: Number(deferDays), includeSandbox });
    setDeferInfo(r.ok ? `${r.data.eligible} subscriber(s) would have their next billing date pushed back ${r.data.days} day(s). ${r.data.skipped} are skipped (cancelled, not Google Play, expired, or licence testers).` : r.error);
    setBusy(null);
  }

  async function deferRun() {
    if (!confirm(`Push every eligible subscriber's next billing date back by ${deferDays} day(s)?\n\nGoogle Play will not charge them until the new date. This cannot be undone from here.`)) return;
    setBusy('deferRun');
    setDeferInfo(null);
    const r = await billing<{ done: number; skipped: number; failed: { userId: string; error: string }[] }>({ action: 'defer.run', days: Number(deferDays), includeSandbox, confirm: true });
    setDeferInfo(r.ok ? `Done: ${r.data.done} deferred, ${r.data.failed.length} failed, ${r.data.skipped} skipped.${r.data.failed.length ? ` The ${r.data.failed.length} that failed will STILL BE CHARGED. First error: ${r.data.failed[0].error}` : ''}` : r.error);
    loadLog();
    setBusy(null);
  }

  const planChoices = useMemo(
    () => (products ?? []).flatMap((p) => p.basePlans.map((b) => ({ value: `${p.productId}|${b.basePlanId}`, label: `${PRODUCT_NAMES[p.productId] ?? p.productId} · ${b.basePlanId}` }))),
    [products]
  );
  const chosenPlan = offerForm.plan || planChoices[0]?.value || '';

  async function createOffer() {
    const [productId, basePlanId] = chosenPlan.split('|');
    if (!productId || !basePlanId) return;
    setBusy('offerCreate');
    setOfferMsg(null);
    const r = await billing<{ ok: true; offer: OfferRow }>({
      action: 'offers.create', productId, basePlanId, offerId: offerForm.offerId.trim(), kind: offerForm.kind,
      percentOff: Number(offerForm.percentOff), periods: Number(offerForm.periods), days: Number(offerForm.days),
    });
    if (r.ok) {
      setOfferMsg({ kind: 'ok', text: `Draft offer "${r.data.offer.offerId}" created (${r.data.offer.description}). Nobody sees it until you activate it.` });
      setOfferForm({ ...offerForm, offerId: '' });
      await Promise.all([loadOffers(), loadLog()]);
    } else {
      setOfferMsg({ kind: 'error', text: r.error });
      loadLog();
    }
    setBusy(null);
  }

  async function setOfferState(o: OfferRow, action: 'offers.activate' | 'offers.deactivate') {
    const activating = action === 'offers.activate';
    if (!confirm(activating ? `Activate "${o.offerId}" now?\n\n${o.description}\n\nNew subscribers will start getting this offer.` : `Deactivate "${o.offerId}"?\n\nNew subscribers will stop getting it. People who already have it keep it.`)) return;
    setBusy(`offer:${o.offerId}`);
    setOfferMsg(null);
    const r = await billing<{ ok: true }>({ action, productId: o.productId, basePlanId: o.basePlanId, offerId: o.offerId });
    setOfferMsg(r.ok ? { kind: 'ok', text: `"${o.offerId}" is now ${activating ? 'active' : 'inactive'}.` } : { kind: 'error', text: r.error });
    await Promise.all([loadOffers(), loadLog()]);
    setBusy(null);
  }

  const direction = preview?.direction;
  const input = 'w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink';

  return (
    <div className="space-y-6">
      {/* ── Prices ─────────────────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-edge p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-ink flex items-center gap-2"><Tag className="w-5 h-5 text-acc" /> Subscription prices (Google Play)</h2>
          <button onClick={loadPrices} disabled={busy === 'load'} className="flex items-center gap-1.5 text-xs font-bold text-acc-strong px-3 py-1.5 rounded-lg border border-edge hover:bg-card-2 disabled:opacity-60">
            {busy === 'load' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Reload
          </button>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          These are the real prices in Google Play. The app always shows the price Google returns, so changing a price here changes what people see and pay.
        </p>

        <div className="rounded-xl bg-warn-soft border border-warn-edge p-3 text-xs text-warn-strong leading-relaxed flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Price increases:</strong> existing subscribers keep their old price until they accept the new one. Google tells them by notification and email, and anyone who does not accept is cancelled after the notice period.
            <strong> Price decreases</strong> apply to existing subscribers automatically. New subscribers always pay the new price at once.
          </span>
        </div>

        {loadError && <p role="alert" className="text-sm text-danger bg-danger-soft border border-danger-edge rounded-xl p-3">{loadError}</p>}
        {!products && !loadError && <div className="flex justify-center py-6 text-ink-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>}

        {products?.map((p) => (
          <div key={p.productId} className="rounded-xl border border-edge">
            <div className="px-4 py-2.5 bg-card-2 rounded-t-xl font-bold text-sm text-ink">{PRODUCT_NAMES[p.productId] ?? p.productId} <span className="text-ink-faint font-medium">({p.productId})</span></div>
            {p.error && <p className="p-4 text-xs text-danger">{p.error}</p>}
            {p.basePlans.map((bp) => {
              const rows = bp.prices.filter((r) => showAll || MAIN_REGIONS.includes(r.regionCode));
              return (
                <div key={bp.basePlanId} className="p-4 border-t border-edge">
                  <p className="text-sm font-bold text-ink mb-2">{bp.basePlanId} <span className="text-xs text-ink-muted font-medium">{bp.billingPeriod === 'P1M' ? 'monthly' : bp.billingPeriod === 'P1Y' ? 'yearly' : bp.billingPeriod} · {bp.state ?? ''}</span></p>
                  <ul className="divide-y divide-edge">
                    {rows.map((r) => {
                      const isEditing = editing?.productId === p.productId && editing.basePlanId === bp.basePlanId && editing.regionCode === r.regionCode;
                      return (
                        <li key={r.regionCode} className="py-2">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="text-ink-soft">{regionLabel(r.regionCode)}</span>
                            <span className="flex items-center gap-3">
                              <span className="font-bold text-ink tabular-nums">{money(r.priceMicros, r.currencyCode)}</span>
                              <button onClick={() => startEdit(p.productId, bp.basePlanId, r)} className="text-xs font-bold text-acc-strong hover:underline">Edit</button>
                            </span>
                          </div>
                          {isEditing && currentRow && (
                            <div className="mt-3 rounded-xl bg-card-2 border border-edge p-3 space-y-3">
                              <label className="block text-xs font-bold text-ink-muted">New price in {r.currencyCode}
                                <input value={priceInput} onChange={(e) => { setPriceInput(e.target.value); setPreview(null); }} inputMode="decimal" className={cn(input, 'mt-1')} aria-label={`New price in ${r.currencyCode}`} />
                              </label>
                              <button onClick={runPreview} disabled={busy !== null} className="px-3 py-2 rounded-lg border border-edge-strong text-xs font-bold text-ink-soft hover:bg-card disabled:opacity-60 flex items-center gap-1.5">
                                {busy === 'preview' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Preview change
                              </button>
                              {preview && (
                                <div className="space-y-2">
                                  <p className="text-sm font-bold text-ink">{money(preview.oldPriceMicros, preview.currencyCode)} → {money(preview.newPriceMicros, preview.currencyCode)} <span className={cn('text-xs', direction === 'increase' ? 'text-warn-strong' : 'text-emerald-600')}>({direction})</span></p>
                                  {direction === 'increase' && <p className="text-xs text-warn-strong">This is a price increase. Existing subscribers must accept it before they pay more.</p>}
                                  {direction === 'decrease' && <p className="text-xs text-emerald-700">This is a price decrease. It applies to existing subscribers automatically.</p>}
                                  {preview.regionCode !== 'OTHER_USD' && preview.regionCode !== 'OTHER_EUR' && direction !== 'same' && (
                                    <label className="flex items-start gap-2 text-xs text-ink-soft">
                                      <input type="checkbox" checked={applyExisting} onChange={(e) => setApplyExisting(e.target.checked)} className="mt-0.5" />
                                      <span>Also move existing subscribers in this country to the new price{direction === 'increase' ? ' (they will be asked to accept it)' : ''}.</span>
                                    </label>
                                  )}
                                  {direction !== 'same' && (
                                    <button onClick={applyPrice} disabled={busy !== null} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-1.5">
                                      {busy === 'apply' && <Loader2 className="w-4 h-4 animate-spin" />} Apply in Google Play
                                    </button>
                                  )}
                                </div>
                              )}
                              <button onClick={() => { setEditing(null); setPreview(null); }} className="text-xs text-ink-muted hover:underline">Cancel</button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        ))}

        {products && <button onClick={() => setShowAll((v) => !v)} className="text-xs font-bold text-acc-strong hover:underline">{showAll ? 'Show main countries only' : 'Show every country'}</button>}
        {priceMsg && <p role="status" className={cn('text-sm rounded-xl p-3 border', priceMsg.kind === 'ok' ? 'text-emerald-700 bg-acc-soft border-acc-edge' : 'text-danger bg-danger-soft border-danger-edge')}>{priceMsg.kind === 'ok' && <Check className="inline w-4 h-4 mr-1" />}{priceMsg.text}</p>}
      </section>

      {/* ── Free premium mode ──────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-edge p-5 space-y-4">
        <h2 className="font-bold text-ink flex items-center gap-2"><Gift className="w-5 h-5 text-acc" /> Free Premium Mode</h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          While this is on, everyone gets every Partner and Leader feature, the subscribe screens are hidden, and a small banner says &ldquo;Premium is free for a limited time&rdquo;. With an end date it switches itself off.
        </p>
        <p className={cn('text-sm font-bold rounded-xl p-3', freeNow?.active ? 'bg-acc-soft text-acc-strong' : 'bg-card-2 text-ink-muted')} role="status">
          {freeNow?.active ? `ON now${freeNow.endsAt ? ` until ${new Date(freeNow.endsAt).toLocaleString()}` : ' (no end date)'}` : free.enabled ? 'Switched on, but not active right now (before the start date or after the end date).' : 'OFF'}
        </p>
        <div className="rounded-xl bg-warn-soft border border-warn-edge p-3 text-xs text-warn-strong leading-relaxed flex gap-2" role="note">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>Free Premium Mode does not pause anyone&apos;s payments.</strong> {free.existing === 'keep' || !free.enabled
              ? 'People who already pay for Partner or Leader will still be charged as normal while it is on.'
              : 'People who already pay will keep being charged until you press "Defer billing now" below, which pushes their next billing date back.'}
          </span>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          <input type="checkbox" checked={free.enabled} onChange={(e) => setFree({ ...free, enabled: e.target.checked })} /> Free Premium Mode on
        </label>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-xs font-bold text-ink-muted">Start (optional)
            <input type="datetime-local" value={toLocalInput(free.start)} onChange={(e) => setFree({ ...free, start: e.target.value ? new Date(e.target.value).toISOString() : null })} className={cn(input, 'mt-1')} />
          </label>
          <label className="text-xs font-bold text-ink-muted">End (optional)
            <input type="datetime-local" value={toLocalInput(free.end)} onChange={(e) => setFree({ ...free, end: e.target.value ? new Date(e.target.value).toISOString() : null })} className={cn(input, 'mt-1')} />
          </label>
        </div>
        <fieldset className="space-y-2">
          <legend className="text-xs font-bold text-ink-muted mb-1">People who already pay for a subscription</legend>
          {([['keep', 'Keep charging them as normal'], ['defer', 'Push their next billing date back by the free period']] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-ink-soft">
              <input type="radio" name="existing" checked={free.existing === value} onChange={() => setFree({ ...free, existing: value })} /> {label}
            </label>
          ))}
        </fieldset>
        <button onClick={() => saveFree(free)} disabled={busy !== null} className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-2">
          {busy === 'free' && <Loader2 className="w-4 h-4 animate-spin" />} Save
        </button>
        {freeMsg && <p role="status" className={cn('text-sm rounded-xl p-3 border', freeMsg.kind === 'ok' ? 'text-emerald-700 bg-acc-soft border-acc-edge' : 'text-danger bg-danger-soft border-danger-edge')}>{freeMsg.text}</p>}

        {free.existing === 'defer' && (
          <div className="rounded-xl border border-edge bg-card-2 p-4 space-y-3">
            <p className="text-sm font-bold text-ink">Defer billing for current subscribers</p>
            <p className="text-xs text-ink-muted leading-relaxed">Nothing is deferred automatically. Preview first, then press the button once. Each eligible subscriber&apos;s next billing date moves back by the number of days below (Google allows up to 365).</p>
            <label className="text-xs font-bold text-ink-muted block">Days to defer
              <input value={deferDays} onChange={(e) => { setDeferDays(e.target.value); setDeferInfo(null); }} inputMode="numeric" className={cn(input, 'mt-1 max-w-[8rem]')} />
            </label>
            <p className="text-xs text-ink-muted leading-relaxed">This uses RevenueCat&apos;s own &ldquo;defer a subscription&rdquo; call, which needs no purchase tokens. If a subscriber cannot be deferred, they are listed as failed and are <strong>still charged</strong>. Try it on a licence tester first (tick the box below) before using it on real subscribers.</p>
            <label className="flex items-center gap-2 text-xs text-ink-soft"><input type="checkbox" checked={includeSandbox} onChange={(e) => setIncludeSandbox(e.target.checked)} /> Include licence testers (for testing only)</label>
            <div className="flex flex-wrap gap-2">
              <button onClick={deferPreview} disabled={busy !== null} className="px-3 py-2 rounded-lg border border-edge-strong text-xs font-bold text-ink-soft hover:bg-card disabled:opacity-60 flex items-center gap-1.5">{busy === 'deferPreview' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Preview</button>
              <button onClick={deferRun} disabled={busy !== null} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-1.5">{busy === 'deferRun' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Defer billing now</button>
            </div>
            {deferInfo && <p role="status" className="text-sm text-ink-soft">{deferInfo}</p>}
          </div>
        )}
      </section>

      {/* ── Promotional offers ─────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-edge p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-bold text-ink">Promotional offers</h2>
          <button onClick={loadOffers} disabled={busy === 'offers'} className="flex items-center gap-1.5 text-xs font-bold text-acc-strong px-3 py-1.5 rounded-lg border border-edge hover:bg-card-2 disabled:opacity-60">
            {busy === 'offers' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Reload
          </button>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          Make a cheaper first period or a free trial for <strong>new customers</strong>. A new offer is a <strong>draft</strong>: nobody sees it until you press Activate. When an offer is active, Google Play shows people the best deal they qualify for, and the app displays it automatically.
        </p>

        <div className="rounded-xl border border-edge bg-card-2 p-4 space-y-3">
          <p className="text-sm font-bold text-ink">New offer</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="text-xs font-bold text-ink-muted">Plan
              <select value={chosenPlan} onChange={(e) => setOfferForm({ ...offerForm, plan: e.target.value })} className={cn(input, 'mt-1')} aria-label="Plan">
                {planChoices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-ink-muted">Offer name
              <input value={offerForm.offerId} onChange={(e) => setOfferForm({ ...offerForm, offerId: e.target.value.toLowerCase() })} placeholder="welcome-50-off" className={cn(input, 'mt-1')} aria-label="Offer name" />
            </label>
            <label className="text-xs font-bold text-ink-muted">Type
              <select value={offerForm.kind} onChange={(e) => setOfferForm({ ...offerForm, kind: e.target.value as 'discount' | 'trial' })} className={cn(input, 'mt-1')} aria-label="Offer type">
                <option value="discount">Discount for the first billing periods</option>
                <option value="trial">Free trial</option>
              </select>
            </label>
            {offerForm.kind === 'discount' ? (
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-bold text-ink-muted">Percent off
                  <input value={offerForm.percentOff} onChange={(e) => setOfferForm({ ...offerForm, percentOff: e.target.value })} inputMode="numeric" className={cn(input, 'mt-1')} aria-label="Percent off" />
                </label>
                <label className="text-xs font-bold text-ink-muted">Billing periods
                  <input value={offerForm.periods} onChange={(e) => setOfferForm({ ...offerForm, periods: e.target.value })} inputMode="numeric" className={cn(input, 'mt-1')} aria-label="Billing periods" />
                </label>
              </div>
            ) : (
              <label className="text-xs font-bold text-ink-muted">Free days
                <input value={offerForm.days} onChange={(e) => setOfferForm({ ...offerForm, days: e.target.value })} inputMode="numeric" className={cn(input, 'mt-1')} aria-label="Free days" />
              </label>
            )}
          </div>
          <button onClick={createOffer} disabled={busy !== null || !chosenPlan || !offerForm.offerId.trim()} className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 disabled:opacity-60 flex items-center gap-1.5">
            {busy === 'offerCreate' && <Loader2 className="w-4 h-4 animate-spin" />} Create draft offer
          </button>
        </div>

        {offers && offers.length === 0 && <p className="text-sm text-ink-muted">No offers yet.</p>}
        <ul className="space-y-2">
          {offers?.map((o) => (
            <li key={`${o.productId}|${o.basePlanId}|${o.offerId}`} className="rounded-lg bg-card-2 p-3 text-xs text-ink-soft flex items-center justify-between gap-3">
              <span>
                <strong className="text-ink">{o.offerId}</strong> <span className="text-ink-faint">({PRODUCT_NAMES[o.productId] ?? o.productId} · {o.basePlanId})</span>
                <span className="block">{o.description}</span>
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className={cn('font-bold', o.state === 'ACTIVE' ? 'text-emerald-600' : 'text-ink-muted')}>{o.state}</span>
                {o.state !== 'ACTIVE' ? (
                  <button onClick={() => setOfferState(o, 'offers.activate')} disabled={busy !== null} className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-bold disabled:opacity-60">Activate</button>
                ) : (
                  <button onClick={() => setOfferState(o, 'offers.deactivate')} disabled={busy !== null} className="px-2.5 py-1 rounded-md border border-edge-strong font-bold text-ink-soft disabled:opacity-60">Deactivate</button>
                )}
              </span>
            </li>
          ))}
        </ul>
        {offerMsg && <p role="status" className={cn('text-sm rounded-xl p-3 border', offerMsg.kind === 'ok' ? 'text-emerald-700 bg-acc-soft border-acc-edge' : 'text-danger bg-danger-soft border-danger-edge')}>{offerMsg.text}</p>}
      </section>

      {/* ── Log ──────────────────────────────────────────────────── */}
      <section className="bg-card rounded-2xl border border-edge p-5 space-y-3">
        <h2 className="font-bold text-ink">Change log</h2>
        {prices.length === 0 && actions.length === 0 && <p className="text-sm text-ink-muted">Nothing has been changed from this screen yet.</p>}
        <ul className="space-y-2">
          {prices.map((l) => (
            <li key={l.id} className="text-xs rounded-lg bg-card-2 p-3 text-ink-soft">
              <strong className="text-ink">{PRODUCT_NAMES[l.productId] ?? l.productId} / {l.basePlanId} / {l.regionCode}</strong>: {money(l.oldPriceMicros, l.currencyCode)} → {money(l.newPriceMicros, l.currencyCode)}{l.appliedToExisting ? ' (existing subscribers included)' : ''}
              <span className={cn('ml-2 font-bold', l.result === 'success' ? 'text-emerald-600' : 'text-danger')}>{l.result}</span>
              {l.errorMessage && <span className="block text-danger mt-0.5">{l.errorMessage}</span>}
              <span className="block text-ink-faint mt-0.5">{l.adminEmail ?? 'unknown admin'} · {new Date(l.createdAt).toLocaleString()}</span>
            </li>
          ))}
          {actions.map((a) => (
            <li key={a.id} className="text-xs rounded-lg bg-card-2 p-3 text-ink-soft">
              <strong className="text-ink">{({ free_mode: 'Free Premium Mode', defer_billing: 'Billing deferred', offer_create: 'Offer created (draft)', offer_activate: 'Offer activated', offer_deactivate: 'Offer deactivated' } as Record<string, string>)[a.action] ?? a.action}</strong> <span className="text-ink-faint">{a.details ? JSON.stringify(a.details) : ''}</span>
              <span className={cn('ml-2 font-bold', a.result === 'success' ? 'text-emerald-600' : 'text-warn-strong')}>{a.result}</span>
              <span className="block text-ink-faint mt-0.5">{a.adminEmail ?? 'unknown admin'} · {new Date(a.createdAt).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
