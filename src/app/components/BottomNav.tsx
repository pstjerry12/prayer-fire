'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pencil, Play, BookOpen, Sparkles, Globe, Clock } from 'lucide-react';
import { cn } from '../utils/cn';

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom bg-white/95 backdrop-blur border-t border-slate-200">
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
                active ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-700'
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[8px] font-medium leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
