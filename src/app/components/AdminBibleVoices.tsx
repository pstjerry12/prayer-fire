'use client';

import { useEffect, useState } from 'react';
import { Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_DAILY_CAP, DEFAULT_VOICES, parseVoiceSettings, type Voice } from '@/lib/bibleAudio';

const field = 'w-full bg-card-2 border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint';
interface Stats { configured: boolean; elevenLabsKey: boolean; storageKey: boolean; ready: number; failed: number; today: number; megabytes: number }

/** Admin -> Pricing -> Bible voices: the premium voices subscribers can choose, and the daily limit on NEW chapters (protects the ElevenLabs bill). */
export default function AdminBibleVoices() {
  const [voices, setVoices] = useState<Voice[]>(DEFAULT_VOICES);
  const [cap, setCap] = useState(DEFAULT_DAILY_CAP);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/settings', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
      fetch('/api/admin/bible-audio', { cache: 'no-store' }).then((r) => r.json()).catch(() => null),
    ]).then(([settings, st]) => {
      const parsed = parseVoiceSettings(settings?.settings?.bible_voices ?? null);
      setVoices(parsed.voices);
      setCap(parsed.dailyCap);
      if (st && !st.error) setStats(st);
      setLoaded(true);
    });
  }, []);

  const set = (i: number, patch: Partial<Voice>) => setVoices((v) => v.map((x, n) => (n === i ? { ...x, ...patch } : x)));

  async function save() {
    const clean = parseVoiceSettings({ voices, dailyCap: cap });
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/settings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bible_voices: JSON.stringify(clean) }) });
      if (!res.ok) throw new Error(String(res.status));
      setVoices(clean.voices);
      setCap(clean.dailyCap);
      setMessage({ kind: 'ok', text: 'Saved. A voice needs a name and a valid ElevenLabs voice id; any that did not were left out.' });
    } catch {
      setMessage({ kind: 'error', text: 'Could not save. Check your connection.' });
    }
    setBusy(false);
  }

  if (!loaded) return <div className="flex justify-center py-6 text-ink-muted"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  return (
    <section className="rounded-2xl border border-edge bg-card p-4 sm:p-5 space-y-3" aria-label="Bible voices">
      <div>
        <h3 className="font-bold text-ink">Bible voices (premium, ElevenLabs)</h3>
        <p className="text-ink-muted text-xs mt-1">Subscribers can choose these voices to hear a chapter. Each chapter is generated ONCE per voice, then saved and reused for everyone. Free users keep the phone&apos;s own voice.</p>
      </div>
      {stats && (
        <p className={stats.configured ? 'text-xs text-acc-strong bg-acc-soft border border-acc-edge rounded-xl p-3' : 'text-xs text-warn-strong bg-warn-soft border border-warn-edge rounded-xl p-3'} data-testid="audio-status">
          {stats.configured
            ? `Switched on. ${stats.ready} chapters saved (${stats.megabytes} MB), ${stats.today} new today${stats.failed ? `, ${stats.failed} failed` : ''}.`
            : `Not switched on yet: ${[!stats.elevenLabsKey && 'ELEVENLABS_API_KEY is missing', !stats.storageKey && 'SUPABASE_SERVICE_ROLE_KEY is missing'].filter(Boolean).join(' and ')} in Vercel. Until then the app does not offer premium voices. Steps are in PROJECT_HANDOFF.md, Bible audio.`}
        </p>
      )}
      {voices.map((v, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_1.4fr_auto] items-end rounded-xl border border-edge p-3">
          <label className="text-xs text-ink-muted">Name shown<input className={field} value={v.label} maxLength={40} onChange={(e) => set(i, { label: e.target.value, id: v.id || e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30) })} placeholder="African accent" /></label>
          <label className="text-xs text-ink-muted">Short note<input className={field} value={v.description} maxLength={80} onChange={(e) => set(i, { description: e.target.value })} placeholder="A warm, calm voice" /></label>
          <label className="text-xs text-ink-muted">ElevenLabs voice id<input className={field} value={v.elevenVoiceId} maxLength={40} onChange={(e) => set(i, { elevenVoiceId: e.target.value.trim() })} placeholder="from the ElevenLabs voice library" /></label>
          <div className="flex items-center gap-2 pb-1.5">
            <label className="flex items-center gap-1 text-xs font-semibold text-ink"><input type="checkbox" checked={v.enabled} onChange={(e) => set(i, { enabled: e.target.checked })} /> On</label>
            <button aria-label={`Remove ${v.label || 'voice'}`} onClick={() => setVoices((all) => all.filter((_, n) => n !== i))} className="p-1.5 text-ink-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
      ))}
      <button onClick={() => setVoices((v) => (v.length >= 8 ? v : [...v, { id: '', label: '', description: '', elevenVoiceId: '', enabled: true }]))} className="text-acc-strong text-xs font-bold flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add a voice</button>
      <label className="block text-xs text-ink-muted">Most NEW chapters generated per day (all voices together). Chapters already saved never count, and 0 pauses new generation.
        <input type="number" min={0} max={5000} value={cap} onChange={(e) => setCap(Number(e.target.value))} aria-label="Daily limit" className={field + ' mt-1 sm:w-40'} />
      </label>
      {message && <p role="status" className={message.kind === 'ok' ? 'text-sm text-acc-strong bg-acc-soft border border-acc-edge rounded-xl p-3' : 'text-sm text-danger bg-danger-soft border border-danger-edge rounded-xl p-3'}>{message.text}</p>}
      <button onClick={save} disabled={busy} className="w-full py-2.5 rounded-xl bg-acc text-on-acc font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save voices</button>
    </section>
  );
}
