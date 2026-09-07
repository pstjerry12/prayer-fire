import { getStoredToken } from '@/lib/authClient';
import type { IntercessoryPrayer } from '@/app/types';

// Client for /api/intercessory-prayers — the Supabase-backed store shared by
// the Prayer Workshop (writes) and the Start-Up Prayer session (reads).
// Sends the stored JWT as a Bearer token, same fallback the server route
// already accepts, since cookies don't always ride along inside the
// Capacitor WebView.

function authHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchIntercessoryPrayers(): Promise<IntercessoryPrayer[]> {
  const res = await fetch('/api/intercessory-prayers', {
    headers: authHeaders(),
    cache: 'no-store',
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { prayers?: IntercessoryPrayer[] };
  return data.prayers ?? [];
}

export async function createIntercessoryPrayer(input: {
  category: string;
  title: string;
  details: string;
}): Promise<IntercessoryPrayer | null> {
  const res = await fetch('/api/intercessory-prayers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(input),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { prayer?: IntercessoryPrayer };
  return data.prayer ?? null;
}
