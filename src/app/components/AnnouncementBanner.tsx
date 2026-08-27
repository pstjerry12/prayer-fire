'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export default function AnnouncementBanner() {
  const [latest, setLatest] = useState<Announcement | null>(null);

  useEffect(() => {
    fetch('/api/announcements')
      .then((r) => r.json())
      .then((d) => setLatest(d.announcements?.[0] ?? null))
      .catch(() => setLatest(null));
  }, []);

  if (!latest) return null;

  return (
    <div className="max-w-2xl md:max-w-5xl mx-auto px-4 mt-4">
      <div className="bg-warn-soft border border-warn-edge rounded-2xl p-4 flex items-start gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-warn-soft-2 text-warn shrink-0">
          <Megaphone className="w-4 h-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-warn-strong">Announcement</p>
          <p className="text-ink font-bold text-sm mt-0.5">{latest.title}</p>
          <p className="text-ink-soft text-xs mt-0.5 leading-relaxed">{latest.body}</p>
        </div>
      </div>
    </div>
  );
}
