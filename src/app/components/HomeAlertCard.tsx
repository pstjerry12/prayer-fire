'use client';

import Link from 'next/link';
import { ChevronRight, Siren } from 'lucide-react';
import { useCachedJson } from '@/lib/cachedJson';
import type { AlertSummary } from '@/lib/alerts';

/**
 * The most urgent live Global Prayer Alert, at the very top of Home. Shows nothing when there is no live alert, so the Home
 * layout is unchanged on an ordinary day. The saved copy shows at once; the number of people praying refreshes within 2 minutes.
 */
export default function HomeAlertCard() {
  const data = useCachedJson<{ alerts: AlertSummary[] }>('/api/alerts', 2 * 60 * 1000);
  const top = data?.alerts?.[0];
  if (!top) return null;
  const more = (data?.alerts.length ?? 1) - 1;
  return (
    <Link href="/alerts" data-testid="home-alert" className="mb-3 flex items-center gap-3 rounded-2xl border border-danger-edge bg-danger-soft px-4 py-3 hover:opacity-90">
      <span className="w-9 h-9 rounded-full bg-card text-danger flex items-center justify-center flex-shrink-0"><Siren className="w-5 h-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.625rem] font-bold uppercase tracking-wider text-danger-strong">Urgent prayer need{more > 0 ? ` · ${more} more` : ''}</span>
        <span className="block text-sm font-bold text-ink leading-snug truncate">{top.title}</span>
        <span className="block text-xs text-ink-muted">{top.praying > 0 ? `${top.praying.toLocaleString()} praying${top.countries > 0 ? ` from ${top.countries} ${top.countries === 1 ? 'country' : 'countries'}` : ''}` : 'Be the first to pray'}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-ink-muted flex-shrink-0" />
    </Link>
  );
}
