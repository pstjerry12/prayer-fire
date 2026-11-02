import type { ReactNode } from 'react';
import { KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';

// Every Prayer Verse page is built ahead of time, so opening one is instant instead of waiting for a server.
export function generateStaticParams() {
  return KJV_BIBLE_VERSES.map((v) => ({ id: v.id }));
}

export default function PrayerVerseLayout({ children }: { children: ReactNode }) {
  return children;
}
