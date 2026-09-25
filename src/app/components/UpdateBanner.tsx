'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshCw, Download, X } from 'lucide-react';
import { getAppVersionInfo, getNativePlatform, PLAY_STORE_URL } from '@/lib/capacitorAlarm';

const CLIENT_BUILD = process.env.NEXT_PUBLIC_BUILD_SHA || '';
const CHECK_INTERVAL_MS = 60_000;

type Update = 'web' | 'store' | null;

// Tells people when an update is waiting:
//  - "web": a newer version went live while the app was open → one-tap refresh
//  - "store": a newer Android build is on the Play Store → open the store
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
      const data: { build: string | null; androidLatestBuild: number | null } = await res.json();

      if (CLIENT_BUILD && data.build && data.build !== CLIENT_BUILD) {
        setUpdate('web');
        return;
      }

      if (data.androidLatestBuild && getNativePlatform() === 'android') {
        const info = await getAppVersionInfo();
        const installed = parseInt(info?.build ?? '', 10);
        if (Number.isFinite(installed) && installed < data.androidLatestBuild) setUpdate('store');
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

  if (!update || dismissed) return null;

  const isWeb = update === 'web';

  return (
    <div className="fixed top-0 left-0 right-0 z-[95] safe-top px-4 pt-3 pointer-events-none">
      <div
        role="status"
        className="pointer-events-auto max-w-md mx-auto flex items-center gap-3 bg-emerald-600 text-white rounded-2xl shadow-xl px-4 py-3"
      >
        {isWeb ? <RefreshCw className="w-5 h-5 shrink-0" /> : <Download className="w-5 h-5 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold leading-tight">
            {isWeb ? 'A new update is ready' : 'New version available'}
          </p>
          <p className="text-xs text-white/85 leading-snug">
            {isWeb ? 'Tap Refresh to get the latest features.' : 'Update Prayer Fire on the Play Store.'}
          </p>
        </div>
        {isWeb ? (
          <button
            onClick={() => window.location.reload()}
            className="shrink-0 bg-white text-emerald-700 rounded-full px-3 py-1.5 text-xs font-bold"
          >
            Refresh
          </button>
        ) : (
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setDismissed(true)}
            className="shrink-0 bg-white text-emerald-700 rounded-full px-3 py-1.5 text-xs font-bold"
          >
            Update
          </a>
        )}
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
