'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Info, LayoutGrid, LogIn, LogOut, Mail, Settings, ShieldCheck, User as UserIcon, X } from 'lucide-react';
import { useApp } from '@/app/context';
import { useI18n } from '@/app/i18n';
import LanguageMenu from './LanguageMenu';
import { cn } from '@/app/utils/cn';

const ROW = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-sm font-semibold text-on-bar hover:bg-bar-hover transition-colors';

/**
 * The side menu (opened with the ☰ button or a swipe from the left edge). Same deep evergreen as the top bar, light text and light-green
 * icons, so it matches the Home screen. It holds only: Settings, Language, Account, About, Privacy Policy and Contact.
 */
export default function SideDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, setShowAuth, setShowSettings, setShowFeedback, signOut } = useApp();
  const { t } = useI18n();
  const [accountOpen, setAccountOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  // Drawn straight into <body>, so it sits above the bottom tab bar and everything else (the header has its own layer).
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const go = (fn: () => void) => () => {
    onClose();
    fn();
  };

  if (!mounted) return null;
  return createPortal(
    <>
      <div
        aria-hidden
        onClick={onClose}
        className={cn('fixed inset-0 z-[88] bg-black/60 transition-opacity duration-200', open ? 'opacity-100' : 'opacity-0 pointer-events-none')}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('menu.open')}
        aria-hidden={!open}
        data-testid="side-drawer"
        onTouchStart={(e) => {
          const p = e.touches[0];
          touch.current = { x: p.clientX, y: p.clientY };
        }}
        onTouchEnd={(e) => {
          const s = touch.current;
          touch.current = null;
          if (!s) return;
          const p = e.changedTouches[0];
          // A clear swipe to the left closes it.
          if (s.x - p.clientX > 60 && Math.abs(p.clientY - s.y) < 50) onClose();
        }}
        className={cn(
          'fixed inset-y-0 left-0 z-[89] w-[82%] max-w-xs bg-bar text-on-bar border-r border-bar-edge shadow-2xl flex flex-col',
          'transition-transform duration-200 ease-out safe-top',
          open ? 'translate-x-0' : '-translate-x-full invisible'
        )}
      >
        <div className="flex items-center gap-3 px-4 py-4 border-b border-bar-edge">
          <div className="w-11 h-11 rounded-full bg-card ring-1 ring-bar-edge overflow-hidden shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-sm.png" width={192} height={192} decoding="async" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-serif-heading text-base font-bold leading-tight truncate">{t('app.name')}</p>
            <p className="text-[0.6875rem] text-bar-accent truncate">
              {user ? user.name || user.email || t('menu.signedIn') : t('menu.guest')}
            </p>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label={t('menu.close')} className="p-2 rounded-full hover:bg-bar-hover">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <Link href="/features" onClick={onClose} className={ROW} data-testid="drawer-features">
            <LayoutGrid className="w-5 h-5 text-bar-accent" aria-hidden />
            <span className="flex-1">{t('menu.features')}</span>
            <ChevronRight className="w-4 h-4 text-on-bar/60" aria-hidden />
          </Link>

          <button className={ROW} onClick={go(() => setShowSettings(true))}>
            <Settings className="w-5 h-5 text-bar-accent" aria-hidden />
            <span className="flex-1">{t('menu.settings')}</span>
            <ChevronRight className="w-4 h-4 text-on-bar/60" aria-hidden />
          </button>

          <LanguageMenu variant="drawer" />

          <div>
            <button className={ROW} aria-expanded={accountOpen} onClick={() => setAccountOpen((o) => !o)}>
              <UserIcon className="w-5 h-5 text-bar-accent" aria-hidden />
              <span className="flex-1">{t('menu.account')}</span>
              <ChevronDown className={cn('w-4 h-4 text-on-bar/60 transition-transform', accountOpen && 'rotate-180')} aria-hidden />
            </button>
            {accountOpen && (
              <div className="mt-1 ml-3 pl-3 border-l border-bar-edge space-y-1">
                {user ? (
                  <>
                    <p className="px-3 pt-1 text-xs text-on-bar/80 truncate">{user.email || user.phone || user.name || t('menu.signedIn')}</p>
                    <button className={ROW} onClick={go(() => setShowSettings(true))}>
                      <UserIcon className="w-4 h-4 text-bar-accent" aria-hidden /> {t('menu.manageAccount')}
                    </button>
                    {user.role === 'admin' && (
                      <Link href="/admin" onClick={onClose} className={ROW}>
                        <ShieldCheck className="w-4 h-4 text-bar-accent" aria-hidden /> {t('menu.admin')}
                      </Link>
                    )}
                    <button className={ROW} onClick={go(() => void signOut())}>
                      <LogOut className="w-4 h-4 text-bar-accent" aria-hidden /> {t('menu.signOut')}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="px-3 pt-1 text-xs text-on-bar/80">{t('menu.guestHint')}</p>
                    <button className={ROW} onClick={go(() => setShowAuth(true))}>
                      <LogIn className="w-4 h-4 text-bar-accent" aria-hidden /> {t('menu.signIn')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <Link href="/about" onClick={onClose} className={ROW}>
            <Info className="w-5 h-5 text-bar-accent" aria-hidden />
            <span className="flex-1">{t('menu.about')}</span>
            <ChevronRight className="w-4 h-4 text-on-bar/60" aria-hidden />
          </Link>

          <Link href="/privacy" onClick={onClose} className={ROW}>
            <ShieldCheck className="w-5 h-5 text-bar-accent" aria-hidden />
            <span className="flex-1">{t('menu.privacy')}</span>
            <ChevronRight className="w-4 h-4 text-on-bar/60" aria-hidden />
          </Link>

          <button className={ROW} onClick={go(() => setShowFeedback(true))}>
            <Mail className="w-5 h-5 text-bar-accent" aria-hidden />
            <span className="flex-1">{t('menu.contact')}</span>
            <ChevronRight className="w-4 h-4 text-on-bar/60" aria-hidden />
          </button>
        </nav>
      </aside>
    </>,
    document.body
  );
}
