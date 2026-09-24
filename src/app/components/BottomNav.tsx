'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pencil, Play, BookOpen, Sparkles, Globe, Clock, Type } from 'lucide-react';
import { cn } from '../utils/cn';
import { useApp } from '../context';

const TABS = [
  { href: '/', label: 'Home', icon: Home, exact: true },
  { href: '/workshop', label: 'Write', icon: Pencil, exact: false },
  { href: '/startup', label: 'Start-Up', icon: Play, exact: false },
  { href: '/bible', label: 'KJV Bible', icon: BookOpen, exact: false },
  { href: '/scripture', label: 'Scripture', icon: Sparkles, exact: false },
  { href: '/network', label: 'Partners', icon: Globe, exact: false },
  { href: '/fasting', label: 'Fasting', icon: Clock, exact: false },
];

export default function BottomNav() {
  const pathname = usePathname();
  const { setShowSettings } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-page/95 backdrop-blur border-t border-edge md:hidden">
      {/* Navigation tabs */}
      <div className="max-w-4xl mx-auto grid grid-cols-7">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 transition-colors',
                active ? 'text-acc' : 'text-ink-faint hover:text-ink-soft'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[clamp(8px,0.5rem,10px)] font-medium leading-none whitespace-nowrap">{tab.label}</span>
            </Link>
          );
        })}
      </div>
      {/* Jerry's name — always visible above phone's home bar */}
      <div className="relative text-center py-1 border-t border-edge/50">
        <span className="text-ink-faint text-[0.5625rem] font-medium">Pastor Jerry C.</span>
        {/* Quick access to the Text Size setting */}
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          aria-label="Text size settings"
          className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded-full border border-edge text-ink-muted hover:text-acc hover:border-acc-edge text-[0.625rem] font-bold"
        >
          <Type className="w-3 h-3" />
          Aa
        </button>
      </div>
    </nav>
  );
}
