'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Flame, Crown, LogIn, ChevronRight, Moon, Sun, ShieldCheck } from 'lucide-react';
import { useApp } from '@/app/context';

const NAV_LINKS = [
  { href: '/workshop', label: 'Write Prayer' },
  { href: '/startup', label: 'Start-Up Prayer' },
  { href: '/worship', label: 'Worship' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/partner', label: 'Partner' },
  { href: '/scripture', label: 'Scripture' },
  { href: '/bible', label: 'Bible' },
  { href: '/fasting', label: 'Fasting' },
  { href: '/network', label: 'Network' },
];

export default function Navbar() {
  const { streak, user, setShowAuth, setShowSettings, signOut, theme, toggleTheme } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 safe-top bg-page/95 backdrop-blur border-b border-edge">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-danger-soft ring-1 ring-red-200 flex items-center justify-center overflow-hidden">
            <img src="/logo.png" alt="Prayer Fire Movement" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="font-serif-heading text-base font-bold text-ink leading-tight">Prayer Fire Movement</h1>
            <p className="text-[10px] text-ink-muted">A Cure For Prayerlessness</p>
            <p className="text-[10px] text-danger font-semibold italic leading-tight">Praying like Daniel</p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-0.5 mr-1">
            {NAV_LINKS.slice(0, 5).map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="px-2.5 py-1.5 text-sm font-medium text-ink-muted hover:text-acc-strong hover:bg-acc-soft rounded-lg transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1 bg-warn-soft px-2 py-1 rounded-full border border-warn-edge">
            <Flame className="w-4 h-4 text-warn" />
            <span className="text-warn-strong font-bold text-sm">{streak}</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-card-3 rounded-full transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to night mode'}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-ink-muted" />}
          </button>

          {user ? (
            <Link
              href="/"
              onClick={() => setShowSettings(true)}
              className="hidden md:flex w-9 h-9 rounded-full bg-emerald-600 text-white text-sm font-bold items-center justify-center hover:bg-emerald-500 transition-colors"
              title={user.name || 'Account'}
            >
              {(user.name || user.email || 'P').charAt(0).toUpperCase()}
            </Link>
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="hidden md:block px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500 transition-colors"
            >
              Sign In
            </button>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 hover:bg-card-3 rounded-full transition-colors">
            {menuOpen ? <X className="w-5 h-5 text-ink-muted" /> : <Menu className="w-5 h-5 text-ink-muted" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-card border-b border-edge p-4 space-y-2 shadow-lg">
          {user ? (
            <div className="flex items-center gap-3 p-3 bg-card-2 rounded-xl border border-edge">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-sm flex items-center justify-center flex-shrink-0">
                {(user.name || user.email || 'P').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-ink font-bold text-sm truncate">{user.name || 'Prayer Partner'}</p>
                <p className="text-ink-muted text-[10px] truncate">
                  {user.email || (user.phone ? `${user.countryCode ?? ''} ${user.phone}` : 'Signed in')}
                </p>
              </div>
              <button
                onClick={() => { signOut(); setMenuOpen(false); }}
                className="px-3 py-1.5 bg-card-3 text-ink-soft rounded-lg text-xs font-semibold hover:bg-card-3"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setShowAuth(true); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 p-3 bg-acc-soft rounded-xl text-acc-strong border border-acc-edge"
            >
              <LogIn className="w-5 h-5" />
              <span className="font-bold text-sm">Sign In / Create Account</span>
            </button>
          )}

          {user?.role === 'admin' && (
            <Link
              href="/admin"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center gap-3 p-3 bg-amber-50 rounded-xl text-amber-700 border border-amber-200 dark:bg-warn-soft dark:text-warn-strong dark:border-warn-edge"
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="font-bold text-sm">Admin Back Office</span>
            </Link>
          )}

          <Link
            href="/partner"
            onClick={() => setMenuOpen(false)}
            className="w-full flex items-center gap-3 p-3 bg-acc-soft rounded-xl text-acc-strong border border-acc-edge"
          >
            <Crown className="w-5 h-5" />
            <span className="font-bold text-sm">Prayer Fire Partner</span>
          </Link>

          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className="flex items-center justify-between p-3 bg-card rounded-xl text-ink-soft hover:bg-card-2 border border-edge"
            >
              {l.label}
              <ChevronRight className="w-4 h-4 text-ink-faint" />
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
