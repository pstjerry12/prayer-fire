'use client';

import { Home, Flame, Users, BookOpen, Settings } from 'lucide-react';
import { cn } from '../utils/cn';

export type NavView = 'home' | 'workshop' | 'network' | 'bible' | 'settings';

interface Props {
  currentView: NavView;
  onHome: () => void;
  onWorkshop: () => void;
  onNetwork: () => void;
  onBible: () => void;
  onSettings: () => void;
}

interface NavItem {
  id: NavView;
  label: string;
  icon: typeof Home;
  onClick: () => void;
}

export default function BottomNav({
  currentView,
  onHome,
  onWorkshop,
  onNetwork,
  onBible,
  onSettings,
}: Props) {
  const items: NavItem[] = [
    { id: 'home', label: 'Home', icon: Home, onClick: onHome },
    { id: 'workshop', label: 'Pray', icon: Flame, onClick: onWorkshop },
    { id: 'network', label: 'Partners', icon: Users, onClick: onNetwork },
    { id: 'bible', label: 'Bible', icon: BookOpen, onClick: onBible },
    { id: 'settings', label: 'Account', icon: Settings, onClick: onSettings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-bottom bg-white/95 backdrop-blur border-t border-slate-200">
      <div className="max-w-3xl mx-auto grid grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 transition-colors',
                active ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
