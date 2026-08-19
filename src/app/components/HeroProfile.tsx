'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MoreVertical, LogOut, LogIn, User as UserIcon, Settings, ShieldCheck, X,
} from 'lucide-react';
import { useApp } from '@/app/context';

export default function HeroProfile() {
  const { user, signOut, setShowAuth, setShowSettings } = useApp();
  const [open, setOpen] = useState(false);

  const initials = (user?.name || user?.email || 'P').charAt(0).toUpperCase();
  const displayName = user?.name || 'Prayer Partner';
  const displayId = user?.email || (user?.phone ? `${user.countryCode ?? ''} ${user.phone}` : null);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
  };

  return (
    <div className="flex justify-end mb-2">
      <div className="relative">
        {/* Profile pill + 3 dots */}
        <div className="flex items-center gap-1">
          {user && (
            <div className="hidden sm:flex items-center gap-2 bg-card border border-edge rounded-full pl-1 pr-2 py-1 shadow-sm">
              <span className="w-7 h-7 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                {initials}
              </span>
              <span className="text-xs font-semibold text-ink max-w-[90px] truncate">{displayName}</span>
            </div>
          )}
          <button
            onClick={() => setOpen(!open)}
            className="w-9 h-9 rounded-full bg-card border border-edge shadow-sm flex items-center justify-center text-ink-muted hover:text-ink hover:bg-card-2 transition-colors"
            title="Account menu"
          >
            {open ? <X className="w-4 h-4" /> : <MoreVertical className="w-4 h-4" />}
          </button>
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-60 bg-card border border-edge rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            {user ? (
              <div className="p-3 border-b border-edge">
                <p className="text-ink font-bold text-sm truncate">{displayName}</p>
                {displayId && <p className="text-ink-muted text-xs truncate">{displayId}</p>}
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
                    onClick={() => { setOpen(false); setShowSettings(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-card-2"
                  >
                    <UserIcon className="w-4 h-4" /> My Account
                  </button>
                  {user.role === 'admin' && (
                    <Link
                      href="/admin"
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-ink-soft hover:bg-card-2"
                    >
                      <ShieldCheck className="w-4 h-4" /> Admin Back Office
                    </Link>
                  )}
                  <button
                    onClick={() => { setOpen(false); setShowSettings(true); }}
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
                  onClick={() => { setOpen(false); setShowAuth(true); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 hover:bg-acc-soft"
                >
                  <LogIn className="w-4 h-4" /> Sign In / Create Account
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
