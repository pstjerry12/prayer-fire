'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import WatchHowStrip from './WatchHowStrip';
import { usePathname } from 'next/navigation';
import {
  Menu, X, Flame, Crown, LogIn, ChevronDown, Moon, Sun, ShieldCheck,
  MoreVertical, LogOut, User as UserIcon, Settings, BookOpen, Music, PlayCircle, Globe,
} from 'lucide-react';
import { useApp } from '@/app/context';
import { useI18n } from '@/app/i18n';
import type { MessageKey } from '@/lib/i18n/messages';
import { cn } from '@/app/utils/cn';
import LanguageMenu from './LanguageMenu';
import SideDrawer from './SideDrawer';

// The desktop bar groups the sections into categories, each a dropdown. (On a phone the same features are the cards of the Home feature row;
// the ☰ side menu only holds Settings, Language, Account, About, Privacy Policy and Contact.)
const MENU_CATEGORIES: { id: string; label: MessageKey; icon: typeof BookOpen; items: { href: string; label: MessageKey }[] }[] = [
  {
    id: 'discipleship',
    label: 'cat.discipleship',
    icon: BookOpen,
    items: [
      { href: '/scripture', label: 'feat.scripture' },
      { href: '/fasting', label: 'feat.fasting' },
      { href: '/journal', label: 'feat.journal' },
    ],
  },
  {
    id: 'worship',
    label: 'cat.worship',
    icon: Music,
    items: [{ href: '/worship', label: 'feat.worship' }],
  },
  {
    id: 'together',
    label: 'cat.together',
    icon: Globe,
    items: [
      { href: '/alerts', label: 'feat.alerts' },
      { href: '/groups', label: 'feat.groups' },
    ],
  },
  {
    id: 'learn',
    label: 'cat.learn',
    icon: PlayCircle,
    items: [
      { href: '/how-to', label: 'feat.howto' },
      { href: '/podcast', label: 'feat.podcast' },
    ],
  },
];

/** A swipe that starts this close to the left edge (and goes right) opens the side menu. */
const EDGE_PX = 22;
const SWIPE_PX = 56;

export default function Navbar() {
  const { streak, user, setShowAuth, setShowSettings, signOut, theme, toggleTheme } = useApp();
  const { t } = useI18n();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const [menuOpen, setMenuOpen] = useState(false); // the side menu
  const [profileOpen, setProfileOpen] = useState(false); // 3-dots account menu
  const [openCat, setOpenCat] = useState<string | null>(null); // desktop dropdown
  const profileRef = useRef<HTMLDivElement | null>(null);
  const navRef = useRef<HTMLDivElement | null>(null);

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  // Close dropdowns when clicking outside.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) setOpenCat(null);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Swipe from the left edge to open the side menu (phones only).
  useEffect(() => {
    let start: { x: number; y: number } | null = null;
    const onStart = (e: TouchEvent) => {
      const p = e.touches[0];
      start = p && p.clientX <= EDGE_PX ? { x: p.clientX, y: p.clientY } : null;
    };
    const onMove = (e: TouchEvent) => {
      if (!start) return;
      const p = e.touches[0];
      const dx = p.clientX - start.x;
      const dy = Math.abs(p.clientY - start.y);
      if (dx > SWIPE_PX && dx > dy * 1.5) {
        start = null;
        setMenuOpen(true);
      }
    };
    const onEnd = () => {
      start = null;
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
  }, []);

  // Moving to another page closes the side menu.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMenuOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    setProfileOpen(false);
    await signOut();
  };

  return (
    <nav className="sticky top-0 z-50 safe-top bg-bar text-on-bar border-b border-bar-edge">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo (left) */}
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0 mr-1">
          <div className="w-11 h-11 rounded-full bg-card ring-1 ring-bar-edge flex items-center justify-center overflow-hidden flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-sm.png" width={192} height={192} decoding="async" alt={t('app.name')} className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif-heading text-base font-bold text-on-bar leading-[1.1] line-clamp-2 break-words" data-testid="app-name">{t('app.name')}</h1>
            <p className="text-[0.625rem] text-on-bar/80 hidden sm:block">{t('app.tagline')}</p>
            <p className="text-[0.625rem] text-on-bar/80 font-semibold italic leading-tight hidden sm:block">{t('app.subtagline')}</p>
          </div>
        </Link>

        {/* Right controls */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Streak */}
          <div className="flex items-center gap-1 bg-warn-soft-2 px-2 py-1 rounded-full">
            <Flame className="w-4 h-4 text-warn-strong" />
            <span className="text-warn-strong font-bold text-sm">{streak}</span>
          </div>

          {/* Language (Home header; it is also in the side menu and in Settings) */}
          {isHome && <LanguageMenu variant="header" />}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-bar-hover rounded-full transition-colors"
            title={theme === 'dark' ? t('nav.lightMode') : t('nav.nightMode')}
            aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.nightMode')}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-on-bar" /> : <Moon className="w-5 h-5 text-on-bar" />}
          </button>

          {/* 3-dots profile button */}
          <div className="relative hidden md:block" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="p-2 hover:bg-bar-hover rounded-full transition-colors"
              title={t('nav.accountMenu')}
              aria-label={t('nav.accountMenu')}
            >
              {profileOpen ? <X className="w-5 h-5 text-on-bar" /> : <MoreVertical className="w-5 h-5 text-on-bar" />}
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-card text-ink border border-edge rounded-2xl shadow-xl overflow-hidden">
                {user ? (
                  <div className="p-3 border-b border-edge">
                    <p className="text-ink font-bold text-sm truncate">{user.name || t('menu.defaultName')}</p>
                    <p className="text-ink-muted text-xs truncate">
                      {user.email || (user.phone ? `${user.countryCode ?? ''} ${user.phone}` : t('menu.signedIn'))}
                    </p>
                  </div>
                ) : (
                  <div className="p-3 border-b border-edge">
                    <p className="text-ink font-bold text-sm">{t('menu.guest')}</p>
                    <p className="text-ink-muted text-xs">{t('menu.guestHint')}</p>
                  </div>
                )}

                <div className="p-1.5">
                  {user ? (
                    <>
                      <button
                        onClick={() => { setProfileOpen(false); setShowSettings(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-card-2"
                      >
                        <UserIcon className="w-4 h-4" /> {t('menu.myAccount')}
                      </button>
                      {user.role === 'admin' && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-card-2"
                        >
                          <ShieldCheck className="w-4 h-4" /> {t('menu.admin')}
                        </Link>
                      )}
                      <button
                        onClick={() => { setProfileOpen(false); setShowSettings(true); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-card-2"
                      >
                        <Settings className="w-4 h-4" /> {t('menu.settings')}
                      </button>
                      <Link
                        href="/manual"
                        onClick={() => setProfileOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-card-2"
                      >
                        <BookOpen className="w-4 h-4" /> {t('menu.manual')}
                      </Link>
                      <div className="h-px bg-edge my-1.5" />
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-danger hover:bg-danger-soft"
                      >
                        <LogOut className="w-4 h-4" /> {t('menu.signOut')}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setProfileOpen(false); setShowAuth(true); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-acc-strong hover:bg-acc-soft"
                    >
                      <LogIn className="w-4 h-4" /> {t('menu.signIn')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mobile side-menu button */}
          <button
            onClick={() => setMenuOpen(true)}
            aria-label={t('menu.open')}
            aria-expanded={menuOpen}
            data-testid="menu-button"
            className="md:hidden p-2 hover:bg-bar-hover rounded-full transition-colors"
          >
            <Menu className="w-5 h-5 text-on-bar" />
          </button>
        </div>
      </div>

      {/* Desktop nav: category dropdowns */}
      <div className="hidden md:block border-t border-edge bg-page text-ink" ref={navRef}>
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 py-2">
          {MENU_CATEGORIES.map((cat) => (
            <div key={cat.id} className="relative">
              <button
                onClick={() => setOpenCat(openCat === cat.id ? null : cat.id)}
                onMouseEnter={() => setOpenCat(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-lg text-[0.8125rem] font-semibold transition-colors',
                  openCat === cat.id ? 'bg-acc-soft text-acc-strong' : 'text-ink-muted hover:text-acc-strong hover:bg-card-2'
                )}
              >
                <cat.icon className="w-4 h-4" /> {t(cat.label)}
                <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', openCat === cat.id && 'rotate-180')} />
              </button>

              {openCat === cat.id && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-card border border-edge rounded-xl shadow-xl p-1.5 z-50">
                  {cat.items.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={() => setOpenCat(null)}
                      className={cn(
                        'block px-3 py-2 rounded-lg text-sm transition-colors',
                        isActive(it.href) ? 'bg-acc-soft text-acc-strong font-semibold' : 'text-ink-soft hover:bg-card-2'
                      )}
                    >
                      {t(it.label)}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Link
            href="/partner"
            className={cn(
              'ml-auto whitespace-nowrap px-3 py-1.5 rounded-lg text-[0.8125rem] font-bold transition-colors flex items-center gap-1',
              isActive('/partner') ? 'bg-acc-soft text-acc-strong' : 'text-acc-strong hover:bg-acc-soft'
            )}
          >
            <Crown className="w-3.5 h-3.5" /> {t('nav.becomePartner')}
          </Link>
        </div>
      </div>

      {/* A small "Watch how" link when the admin has added a tutorial for this feature's page */}
      <WatchHowStrip />

      <SideDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </nav>
  );
}
