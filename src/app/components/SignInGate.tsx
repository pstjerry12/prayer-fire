'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useApp } from '../context';
import { getLastLogin } from '@/lib/authClient';
import AuthModal from './AuthModal';
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
  const { setUser, user } = useApp();
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
    <div className="fixed inset-0 z-[75] bg-page">
      {/* The sign-in form is the wall. Someone who has signed in on this phone
          before lands on Sign In (their email/phone already filled in); a new
          person lands on Create Account, where "Continue with Google" lives. */}
      <AuthModal
        isOpen
        gated
        initialMode={getLastLogin() ? 'login' : 'register'}
        notice={
          idleMinutes !== null
            ? `🔒 For your privacy you were signed out after ${idleMinutes} minutes of inactivity. Please sign in again.`
            : null
        }
        onClose={() => {}}
        onSuccess={(u) => setUser(u)}
      />
    </div>
  );
}
