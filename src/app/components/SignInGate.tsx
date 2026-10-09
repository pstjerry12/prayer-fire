'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Flame, Mail } from 'lucide-react';
import { useApp } from '../context';
import { startGoogleSignIn } from '@/lib/googleSignIn';
import { IDLE_MINUTES_KEY, IDLE_NOTICE_KEY } from './SessionGuard';

// Pages anyone can read without an account (Play Store / legal requirement).
const PUBLIC_PREFIXES = ['/privacy', '/terms'];

/** True when the app should show the sign-in wall instead of its content. */
export function useSignInRequired(): boolean {
  const { user, authChecked } = useApp();
  const pathname = usePathname() ?? '/';
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  return authChecked && !user && !isPublic;
}

function readIdleNotice(): number | null {
  try {
    if (localStorage.getItem(IDLE_NOTICE_KEY) !== '1') return null;
    const n = parseInt(localStorage.getItem(IDLE_MINUTES_KEY) ?? '', 10);
    return Number.isFinite(n) && n > 0 ? n : 30;
  } catch {
    return null;
  }
}

export default function SignInGate() {
  const { setShowAuth, user } = useApp();
  const required = useSignInRequired();

  // Forget the "signed out for inactivity" note once they sign back in. Only a
  // real signed-out → signed-in change counts: the idle sign-out sets the note
  // in the same moment this effect can still be seeing the old signed-in user.
  const hadUser = useRef(!!user);
  useEffect(() => {
    if (!hadUser.current && user) {
      try { localStorage.removeItem(IDLE_NOTICE_KEY); } catch { /* ignore */ }
    }
    hadUser.current = !!user;
  }, [user]);

  if (!required) return null;

  // Only read here (never during the server render): the wall is only ever
  // shown after the client has finished its first sign-in check.
  const idleMinutes = readIdleNotice();

  return (
    <div className="fixed inset-0 z-[75] bg-page overflow-y-auto safe-top">
      <div className="min-h-full flex flex-col items-center justify-center px-6 py-10 max-w-md mx-auto text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg mb-5">
          <Flame className="w-10 h-10 text-white" />
        </div>
        <h1 className="font-heading text-3xl font-black text-ink mb-2">Prayer Fire</h1>
        <p className="text-ink-muted text-sm mb-6">
          Sign in to continue. Your prayers, streak and progress stay safe in your account.
        </p>

        {idleMinutes !== null && (
          <div className="w-full bg-card-2 border border-edge rounded-xl p-3 mb-5 text-xs text-ink-muted">
            🔒 For your privacy you were signed out after {idleMinutes} minutes of inactivity. Please sign in again.
          </div>
        )}

        <button
          type="button"
          onClick={() => { void startGoogleSignIn(); }}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-card border border-edge-strong text-ink rounded-2xl text-base font-bold hover:bg-card-2 transition-colors shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3 w-full my-4">
          <div className="h-px flex-1 bg-card-3" />
          <span className="text-ink-faint text-xs">or</span>
          <div className="h-px flex-1 bg-card-3" />
        </div>

        <button
          type="button"
          onClick={() => setShowAuth(true)}
          className="w-full flex items-center justify-center gap-2 py-3 text-acc-strong text-sm font-bold rounded-2xl bg-acc-soft hover:brightness-95 transition"
        >
          <Mail className="w-4 h-4 shrink-0" /> Use email or phone instead
        </button>

        <p className="text-[0.6875rem] text-ink-faint mt-8">
          By continuing you agree to our{' '}
          <a href="/terms" className="underline">Terms</a> and{' '}
          <a href="/privacy" className="underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
