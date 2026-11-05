'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Loader2, Trash2, Video as VideoIcon } from 'lucide-react';
import { FEATURES, thumbnailUrl, type Video, type VideoKind } from '@/lib/videos';

const field = 'w-full bg-card border border-edge-strong rounded-lg px-3 py-2 text-sm text-ink placeholder-ink-faint';
const KINDS: { kind: VideoKind; label: string; hint: string }[] = [
  { kind: 'tutorial', label: 'Tutorial (How to use)', hint: 'Shown under "How to use Prayer Fire" and as "Watch how" on that feature\'s page.' },
  { kind: 'podcast', label: 'Podcast episode', hint: 'Shown on the Podcast page; the newest also shows on Home.' },
  { kind: 'teaching', label: 'Short teaching', hint: 'Shown in the swipeable row on Home and on the Podcast page.' },
];

/** Admin -> Videos: paste YouTube links; the title is fetched automatically and the thumbnail comes from the video. */
export default function AdminVideos() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [links, setLinks] = useState('');
  const [kind, setKind] = useState<VideoKind>('podcast');
  const [feature, setFeature] = useState('bible');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/videos', { cache: 'no-store' });
      const d = await res.json();
      if (res.ok) setVideos(d.videos);
      else setMessage({ kind: 'error', text: d.error || 'Could not load.' });
    } catch {
      setMessage({ kind: 'error', text: 'No connection.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function run(body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/videos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await res.json();
      setBusy(false);
      if (res.ok) { setVideos(d.videos); return d; }
      setMessage({ kind: 'error', text: d.error || 'Could not do that.' });
    } catch {
      setBusy(false);
      setMessage({ kind: 'error', text: 'No connection.' });
    }
    return null;
  }

  async function add() {
    const d = await run({ action: 'add', links, kind, feature: kind === 'tutorial' ? feature : null });
    if (!d) return;
    const added = d.result.added.length as number;
    const skipped = d.result.skipped as { input: string; reason: string }[];
    setMessage({ kind: added > 0 ? 'ok' : 'error', text: `${added} added.${skipped.length ? ' Skipped: ' + skipped.map((s) => `${s.input} (${s.reason})`).join(' ') : ''}` });
    if (added > 0) setLinks('');
  }

  const hint = KINDS.find((k) => k.kind === kind)?.hint;
  return (
    <section className="space-y-4" aria-label="Videos">
      <div className="bg-card rounded-2xl border border-edge p-4 space-y-3">
        <div>
          <h3 className="font-bold text-ink flex items-center gap-1.5"><VideoIcon className="w-4 h-4" /> Videos</h3>
          <p className="text-ink-muted text-xs mt-1">Paste YouTube links (one per line). The app fetches each title and thumbnail by itself. All free for everyone.</p>
        </div>
        <textarea className={field} rows={3} placeholder={'https://youtu.be/...\nhttps://www.youtube.com/watch?v=...'} aria-label="YouTube links" value={links} onChange={(e) => setLinks(e.target.value)} />
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-xs text-ink-muted">What kind of video
            <select aria-label="Video kind" value={kind} onChange={(e) => setKind(e.target.value as VideoKind)} className={field + ' mt-1'}>{KINDS.map((k) => <option key={k.kind} value={k.kind}>{k.label}</option>)}</select>
          </label>
          {kind === 'tutorial' && (
            <label className="text-xs text-ink-muted">Which feature it explains
              <select aria-label="Feature" value={feature} onChange={(e) => setFeature(e.target.value)} className={field + ' mt-1'}>{FEATURES.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}</select>
            </label>
          )}
        </div>
        {hint && <p className="text-ink-faint text-[0.6875rem]">{hint}</p>}
        {message && <p role="status" className={message.kind === 'ok' ? 'text-sm text-acc-strong bg-acc-soft border border-acc-edge rounded-xl p-3' : 'text-sm text-danger bg-danger-soft border border-danger-edge rounded-xl p-3'}>{message.text}</p>}
        <button onClick={add} disabled={busy || !links.trim()} className="w-full py-2.5 rounded-xl bg-acc text-on-acc font-bold text-sm disabled:opacity-60 flex items-center justify-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Add videos
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-edge p-4 space-y-2">
        <h4 className="font-bold text-ink text-sm">All videos</h4>
        {loading ? <div className="flex justify-center py-3 text-ink-muted"><Loader2 className="w-5 h-5 animate-spin" /></div> : videos.length === 0 ? <p className="text-ink-muted text-sm">No videos yet.</p> : videos.map((v) => (
          <div key={v.id} data-testid="admin-video-row" className="flex gap-3 items-center rounded-xl border border-edge p-2">
            {/* eslint-disable-next-line @next/next/no-img-element -- external YouTube thumbnail */}
            <img src={thumbnailUrl(v.youtubeId)} alt="" className="w-20 aspect-video object-cover rounded-md flex-shrink-0 bg-card-2" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-ink leading-snug line-clamp-2">{v.title}</p>
              <p className="text-ink-muted text-xs">{KINDS.find((k) => k.kind === v.kind)?.label}{v.feature ? ` · ${FEATURES.find((f) => f.key === v.feature)?.label ?? v.feature}` : ''}{v.published ? '' : ' · hidden'}</p>
            </div>
            <button disabled={busy} aria-label={v.published ? `Hide ${v.title}` : `Show ${v.title}`} onClick={() => run({ action: 'update', id: v.id, published: !v.published })} className="p-1.5 text-ink-muted hover:text-acc-strong">{v.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
            <button disabled={busy} aria-label={`Delete ${v.title}`} onClick={() => { if (confirm('Delete this video from the app?')) run({ action: 'delete', id: v.id }); }} className="p-1.5 text-ink-muted hover:text-danger"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </section>
  );
}
