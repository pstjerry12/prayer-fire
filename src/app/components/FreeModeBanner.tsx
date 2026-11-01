'use client';

import { Gift } from 'lucide-react';
import { useApp } from '../context';

/** A small strip shown while the admin has Free Premium Mode on. */
export default function FreeModeBanner() {
  const { freeMode, user } = useApp();
  if (!freeMode.active || !user) return null;
  let until = '';
  if (freeMode.endsAt) {
    try {
      until = ` until ${new Date(freeMode.endsAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}`;
    } catch {
      until = '';
    }
  }
  return (
    <div role="status" className="flex items-center justify-center gap-1.5 bg-acc text-on-acc text-xs font-bold py-1.5 px-3 text-center">
      <Gift className="w-3.5 h-3.5 shrink-0" /> Premium is free for a limited time{until}
    </div>
  );
}
