import type { ReactNode } from 'react';
import { KJV_BIBLE_CATEGORIES } from '@/app/data/bibleVerses';

// Every topic page is built ahead of time (there are only a few dozen), so opening one is instant instead of waiting
// for a server to answer.
export function generateStaticParams() {
  return KJV_BIBLE_CATEGORIES.map((c) => ({ category: c.id }));
}

export default function TopicLayout({ children }: { children: ReactNode }) {
  return children;
}
