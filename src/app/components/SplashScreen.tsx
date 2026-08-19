'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { cn } from '../utils/cn';

const BOOT_MESSAGES = [
  'Igniting the prayer fire…',
  'Loading your prayer points…',
  'Opening the scripture vault…',
  'Connecting to the global network…',
  'Praying like Daniel…',
];

const TOTAL_MS = 2600;
const STEP_MS = 50;

const SPLASH_KEY = 'pfm_splash_shown';

export default function SplashScreen() {
  const [progress, setProgress] = useState(0);
  const [fading, setFading] = useState(false);
  // Hidden right away if already shown earlier this session.
  const [hidden, setHidden] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      return sessionStorage.getItem(SPLASH_KEY) === '1';
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (hidden) return;

    // Mark as shown immediately so it never replays while the user is in the app.
    try {
      sessionStorage.setItem(SPLASH_KEY, '1');
    } catch {
      // ignore
    }

    let value = 0;
    const interval = window.setInterval(() => {
      value += (100 * STEP_MS) / TOTAL_MS;
      if (value >= 100) {
        value = 100;
        clearInterval(interval);
        window.setTimeout(() => setFading(true), 300);
        window.setTimeout(() => setHidden(true), 800);
      }
      setProgress(Math.min(100, value));
    }, STEP_MS);

    return () => clearInterval(interval);
  }, [hidden]);

  if (hidden) return null;

  const messageIndex = Math.min(
    BOOT_MESSAGES.length - 1,
    Math.floor((progress / 100) * BOOT_MESSAGES.length)
  );

  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-page transition-opacity duration-500',
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      )}
    >
      {/* Logo */}
      <div className="w-24 h-24 rounded-full bg-red-50 ring-2 ring-red-200 flex items-center justify-center overflow-hidden shadow-lg shadow-red-500/20 mb-4">
        <img src="/logo.png" alt="Prayer Fire Movement" className="w-full h-full object-cover" />
      </div>

      {/* App name */}
      <h1 className="font-serif-heading text-2xl font-bold text-ink">Prayer Fire Movement</h1>
      <p className="text-red-600 font-semibold italic text-sm mt-1">Praying like Daniel</p>

      {/* Progress bar */}
      <div className="w-56 mt-8">
        <div className="h-1.5 bg-card-3 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#ff6a00] to-[#ff3d00] transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-ink-muted text-[11px] flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#ff6a00]" />
            {BOOT_MESSAGES[messageIndex]}
          </span>
          <span className="text-ink-muted text-[11px] font-bold tabular-nums">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
