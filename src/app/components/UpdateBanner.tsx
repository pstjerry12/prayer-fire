'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Download, X, Sparkles } from 'lucide-react';
import { pushBackHandler } from '@/lib/backHandlerStack';
import { getAppVersionInfo, getNativePlatform, PLAY_STORE_URL } from '@/lib/capacitorAlarm';

const CLIENT_BUILD = process.env.NEXT_PUBLIC_BUILD_SHA || '';
const CHECK_INTERVAL_MS = 60_000;

const SNOOZE_KEY = 'pfm_update_snooze';
const LATER_MS = 24 * 60 * 60 * 1000; // "Remind me later" → ask again tomorrow
const UPDATE_CLICK_MS = 6 * 60 * 60 * 1000; // after tapping Update, give them time to install

type Update =
  | { kind: 'web' }
  | { kind: 'store'; latest: number; versionName: string; message: string | null }
  | null;

function isSnoozed(latest: number): boolean {
  try {
    const v = JSON.parse(localStorage.getItem(SNOOZE_KEY) ?? 'null') as { build?: number; until?: number } | null;
    return !!v && v.build === latest && typeof v.until === 'number' && Date.now() < v.until;
  } catch {
    return false;
  }
}

function snooze(latest: number, ms: number): void {
  try {
    localStorage.setItem(SNOOZE_KEY, JSON.stringify({ build: latest, until: Date.now() + ms }));
  } catch {
    // storage unavailable — it will simply ask again next time
  }
}

// Tells people when an update is waiting:
//  - "web": a newer version went live while the app was open → one-tap refresh bar
//  - "store": a newer Android build is on the Play Store → a popup with an
//    "Update now" button that opens the Play Store listing. The admin turns it
//    on by entering the new build number (Admin → Settings → App Updates).
// Checks on launch and whenever the app comes back to the foreground.
export default function UpdateBanner() {
  const [update, setUpdate] = useState<Update>(null);
  const [dismissed, setDismissed] = useState(false);
  const lastCheck = useRef(0);

  const check = useCallback(async () => {
    const now = Date.now();
    if (now - lastCheck.current < CHECK_INTERVAL_MS) return;
    lastCheck.current = now;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const res = await fetch('/api/app-version', { cache: 'no-store', signal: ctrl.signal });
      if (!res.ok) return;
      const data: {
        build: string | null;
        androidLatestBuild: number | null;
        androidUpdateMessage?: string | null;
      } = await res.json();

      if (CLIENT_BUILD && data.build && data.build !== CLIENT_BUILD) {
        setUpdate({ kind: 'web' });
        return;
      }

      if (data.androidLatestBuild && getNativePlatform() === 'android') {
        const info = await getAppVersionInfo();
        const installed = parseInt(info?.build ?? '', 10);
        if (Number.isFinite(installed) && installed < data.androidLatestBuild && !isSnoozed(data.androidLatestBuild)) {
          setUpdate({
            kind: 'store',
            latest: data.androidLatestBuild,
            versionName: info?.version ?? '',
            message: data.androidUpdateMessage ?? null,
          });
        }
      }
    } catch {
      // offline — try again next time
    } finally {
      clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    // First check once the app has settled (state updates only after the fetch)
    const t = setTimeout(check, 3000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [check]);

  const storeLatest = update?.kind === 'store' && !dismissed ? update.latest : null;

  // The Android back button closes the popup ("later") instead of leaving the app.
  useEffect(() => {
    if (storeLatest === null) return;
    return pushBackHandler(() => {
      snooze(storeLatest, LATER_MS);
      setDismissed(true);
      return true;
    });
  }, [storeLatest]);

  if (!update || dismissed) return null;

  if (update.kind === 'store') {
    const later = () => {
      snooze(update.latest, LATER_MS);
      setDismissed(true);
    };
    return (
      <div className="fixed inset-0 z-[96] bg-black/60 backdrop-blur-sm flex items-center justify-center p-5">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pfm-update-title"
          className="w-full max-w-sm bg-card rounded-3xl border border-edge shadow-2xl overflow-hidden"
        >
          <div className="bg-gradient-to-br from-orange-500 to-red-600 px-6 pt-7 pb-6 text-center text-white">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
              <Sparkles className="w-7 h-7" />
            </div>
            <h2 id="pfm-update-title" className="font-heading text-xl font-black">New version available</h2>
            <p className="text-sm text-white/90 mt-1">Update Prayer Fire to get the latest features and fixes.</p>
          </div>
          <div className="px-6 py-5">
            {update.message && (
              <p className="text-sm text-ink-soft leading-relaxed bg-card-2 border border-edge rounded-xl p-3 mb-4 whitespace-pre-line">
                {update.message}
              </p>
            )}
            {update.versionName && (
              <p className="text-xs text-ink-faint text-center mb-4">Your version: {update.versionName}</p>
            )}
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                snooze(update.latest, UPDATE_CLICK_MS);
                setDismissed(true);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors"
            >
              <Download className="w-4 h-4" /> Update now
            </a>
            <button
              type="button"
              onClick={later}
              className="w-full mt-2 py-2.5 text-ink-muted text-sm font-semibold hover:text-ink transition-colors"
            >
              Remind me later
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[95] safe-top px-4 pt-3 pointer-events-none">
      <div
        role="status"
        className="pointer-events-auto max-w-md mx-auto flex items-center gap-3 bg-emerald-600 text-white rounded-2xl shadow-xl px-4 py-3"
      >
        <RefreshCw className="w-5 h-5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">A new update is ready</p>
          <p className="text-xs text-white/85 leading-snug">Tap Refresh to get the latest features.</p>
        </div>
        <button
          onClick={() => window.location.reload()}
          className="shrink-0 bg-white text-emerald-700 rounded-full px-3 py-1.5 text-xs font-bold"
        >
          Refresh
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 p-1 -mr-1 rounded-full text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
