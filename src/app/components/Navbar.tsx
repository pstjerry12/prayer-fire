'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Menu, X, Flame, Crown, LogIn, ChevronRight, Moon, Sun, ShieldCheck,
  MoreVertical, LogOut, User as UserIcon, Settings,
} from 'lucide-react';
import { useApp } from '@/app/context';

const NAV_LINKS = [
  { href: '/workshop', label: 'Write Prayer' },
  { href: '/startup', label: 'Start-Up Prayer' },
  { href: '/groups', label: 'Prayer Groups' },
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
  const [menuOpen, setMenuOpen] = useState(false); // mobile nav links
  const [profileOpen, setProfileOpen] = useState(false); // 3-dots account menu
  const profileRef = useRef<HTMLDivElement | null>(null);

  // Close the profile dropdown when clicking outside.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
  };

  return (
    <nav className="sticky top-0 z-50 safe-top bg-page/95 backdrop-blur border-b border-edge">
      <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo (left) */}
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-full bg-danger-soft ring-1 ring-red-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            <img src="/logo.png" alt="Prayer Fire Movement" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif-heading text-base font-bold text-ink leading-tight truncate">Prayer Fire Movement</h1>
            <p className="text-[10px] text-ink-muted hidden sm:block">A Cure For Prayerlessness</p>
            <p className="text-[10px] text-danger font-semibold italic leading-tight hidden sm:block">Praying like Daniel</p>
          </div>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
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

          {/* Streak */}
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

          {/* 3-dots profile button (always visible) */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="p-2 hover:bg-card-3 rounded-full transition-colors"
              title="Account menu"
            >
              {profileOpen ? <X className="w-5 h-5 text-ink-muted" /> : <MoreVertical className="w-5 h-5 text-ink-muted" />}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card border border-edge rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                {user ? (
                  <div className="p-3 border-b border-edge">
                    <p className="text-ink font-bold text-sm truncate">{user.name || 'Prayer Partner'}</p>
                    <p className="text-ink-muted text-xs truncate">
                      {user.email || (user.phone ? `${user.countryCode ?? ''} ${user.phone}` : 'Signed in')}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 border-b border-edge">
                    <p className="text-ink font-bold text-sm">Guest</p>
                    <p className="text-ink-muted text-xs">Sign in to save your prayers</p>
                  </div>
                )}

                {/* Menu items */}
                <div className="p-1.5">
                  {user ? (
                    <>
                      <button
                        onClick={() => { setProfileOpen(false); setShowSettings(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-card-2"
                      >
                        <UserIcon className="w-4 h-4" /> My Account
                      </button>
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-card-2"
                        >
                          <ShieldCheck className="w-4 h-4" /> Admin Back Office
                        </Link>
                      )}
                      <button
                        onClick={() => { setProfileOpen(false); setShowSettings(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-card-2"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </button>
                      <div className="h-px bg-edge my-1.5" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-danger hover:bg-danger-soft"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setProfileOpen(false); setShowAuth(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 hover:bg-acc-soft"
                    >
                      <LogIn className="w-4 h-4" /> Sign In / Create Account
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile nav toggle */}
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 hover:bg-card-3 rounded-full transition-colors">
            {menuOpen ? <X className="w-5 h-5 text-ink-muted" /> : <Menu className="w-5 h-5 text-ink-muted" />}
          </button>
        </div>
      </div>

      {/* Mobile nav links */}
      {menuOpen && (
        <div className="absolute top-full left-0 right-0 bg-card border-b border-edge p-4 space-y-2 shadow-lg">
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
