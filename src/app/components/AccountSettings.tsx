'use client';

import {
  Flame,
  Heart,
  Users,
  Download,
  Trash2,
  Globe,
  X,
  ChevronRight,
  LogOut,
  LogIn,
  ShieldCheck,
  UserCircle,
  Loader2,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { CURRENCIES, type Currency } from '../data/pricingPlans';
import type { AuthUser } from '@/app/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  prayerCount: number;
  intercessoryCount: number;
  streakCount: number;
  currentCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
  onDeleteAccount: () => void;
  onExportData: () => void;
  user: AuthUser | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onOpenPrivacy: () => void;
}

export default function AccountSettings({
  isOpen,
  onClose,
  prayerCount,
  intercessoryCount,
  streakCount,
  currentCurrency,
  onCurrencyChange,
  onDeleteAccount,
  onExportData,
  user,
  onSignIn,
  onSignOut,
  onOpenPrivacy,
}: Props) {
  const [signingOut, setSigningOut] = useState(false);

  if (!isOpen) return null;

  const handleSignOut = async () => {
    setSigningOut(true);
    await onSignOut();
    setSigningOut(false);
  };

  const displayIdentifier = user?.email || (user?.phone ? `${user.countryCode ?? ''} ${user.phone}` : null);

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full flex items-start justify-center p-4 py-10">
        <div className="bg-card rounded-3xl w-full max-w-md border border-edge shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-edge flex items-center justify-between sticky top-0 bg-card z-10">
            <h2 className="font-serif-heading text-lg font-bold text-ink">Account Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-card-3 rounded-full text-ink-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Account */}
            <div>
              <h3 className="text-ink-soft text-sm font-semibold mb-3">Account</h3>
              {user ? (
                <div className="bg-card-2 rounded-xl p-4 border border-edge">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                      <UserCircle className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink font-bold text-sm truncate">
                        {user.name || 'Prayer Partner'}
                      </p>
                      {displayIdentifier && (
                        <p className="text-ink-muted text-xs truncate">{displayIdentifier}</p>
                      )}
                      <span className="inline-block mt-1 bg-acc-soft-2 text-acc-strong text-[10px] font-bold px-2 py-0.5 rounded-full">
                        SIGNED IN
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-card border border-edge-strong text-ink-soft rounded-xl text-sm font-semibold hover:bg-card-3 disabled:opacity-60"
                  >
                    {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  className="w-full flex items-center gap-3 p-4 bg-acc-soft border border-acc-edge rounded-xl hover:bg-acc-soft-2/60 transition-all"
                >
                  <LogIn className="w-5 h-5 text-acc" />
                  <div className="flex-1 text-left">
                    <p className="text-acc-strong font-bold text-sm">Sign In / Create Account</p>
                    <p className="text-ink-muted text-xs">Sync your identity across the community</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-acc" />
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card-2 rounded-xl p-3 text-center border border-edge">
                <Flame className="w-5 h-5 text-acc mx-auto mb-1" />
                <p className="text-ink font-bold text-xl">{streakCount}</p>
                <p className="text-ink-muted text-[10px]">Day Streak</p>
              </div>
              <div className="bg-card-2 rounded-xl p-3 text-center border border-edge">
                <Heart className="w-5 h-5 text-danger mx-auto mb-1" />
                <p className="text-ink font-bold text-xl">{prayerCount}</p>
                <p className="text-ink-muted text-[10px]">Personal</p>
              </div>
              <div className="bg-card-2 rounded-xl p-3 text-center border border-edge">
                <Users className="w-5 h-5 text-acc mx-auto mb-1" />
                <p className="text-ink font-bold text-xl">{intercessoryCount}</p>
                <p className="text-ink-muted text-[10px]">Intercessory</p>
              </div>
            </div>

            {/* Currency */}
            <div>
              <h3 className="text-ink-soft text-sm font-semibold mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-acc" /> Preferred Currency
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => onCurrencyChange(c.code)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left border transition-all',
                      currentCurrency === c.code
                        ? 'bg-acc-soft text-acc-strong border-acc-edge'
                        : 'bg-card text-ink-muted border-edge hover:bg-card-2'
                    )}
                  >
                    <span>{c.flag}</span>
                    <span className="flex-1">{c.code}</span>
                    <span className="text-ink-faint text-xs">{c.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className="space-y-2">
              <h3 className="text-ink-soft text-sm font-semibold">Privacy & Data</h3>
              <button
                onClick={onOpenPrivacy}
                className="w-full flex items-center gap-3 p-3 bg-card-2 rounded-xl border border-edge text-left hover:bg-card-3"
              >
                <ShieldCheck className="w-4 h-4 text-acc" />
                <span className="flex-1 text-sm text-ink-soft">Privacy Policy</span>
                <ChevronRight className="w-4 h-4 text-ink-faint" />
              </button>
              <button
                onClick={onExportData}
                className="w-full flex items-center gap-3 p-3 bg-card-2 rounded-xl border border-edge text-left hover:bg-card-3"
              >
                <Download className="w-4 h-4 text-acc" />
                <span className="flex-1 text-sm text-ink-soft">Export my data (JSON)</span>
                <ChevronRight className="w-4 h-4 text-ink-faint" />
              </button>
              <button
                onClick={onDeleteAccount}
                className="w-full flex items-center gap-3 p-3 bg-danger-soft rounded-xl border border-danger-edge text-left hover:bg-danger-soft-2"
              >
                <Trash2 className="w-4 h-4 text-danger" />
                <span className="flex-1 text-sm text-danger">Delete all data</span>
                <ChevronRight className="w-4 h-4 text-danger" />
              </button>
            </div>

            {/* About */}
            <div className="bg-card-2 rounded-xl p-4 border border-edge text-center">
              <p className="text-ink-muted text-xs leading-relaxed">
                <span className="text-acc-strong font-bold">Prayer Fire Movement</span>
                <br />
                A Cure For Prayerlessness.
                <br />
                <span className="text-ink-faint">Write it. Speak it. Pray it. Trust God.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
