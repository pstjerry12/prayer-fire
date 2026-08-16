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
        <div className="bg-white rounded-3xl w-full max-w-md border border-slate-200 shadow-2xl overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="font-serif-heading text-lg font-bold text-slate-900">Account Settings</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-6">
            {/* Account */}
            <div>
              <h3 className="text-slate-700 text-sm font-semibold mb-3">Account</h3>
              {user ? (
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
                      <UserCircle className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-bold text-sm truncate">
                        {user.name || 'Prayer Partner'}
                      </p>
                      {displayIdentifier && (
                        <p className="text-slate-500 text-xs truncate">{displayIdentifier}</p>
                      )}
                      <span className="inline-block mt-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        SIGNED IN
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-100 disabled:opacity-60"
                  >
                    {signingOut ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  className="w-full flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100/60 transition-all"
                >
                  <LogIn className="w-5 h-5 text-emerald-600" />
                  <div className="flex-1 text-left">
                    <p className="text-emerald-700 font-bold text-sm">Sign In / Create Account</p>
                    <p className="text-slate-500 text-xs">Sync your identity across the community</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-600" />
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                <Flame className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-slate-900 font-bold text-xl">{streakCount}</p>
                <p className="text-slate-500 text-[10px]">Day Streak</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                <Heart className="w-5 h-5 text-red-500 mx-auto mb-1" />
                <p className="text-slate-900 font-bold text-xl">{prayerCount}</p>
                <p className="text-slate-500 text-[10px]">Personal</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                <Users className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="text-slate-900 font-bold text-xl">{intercessoryCount}</p>
                <p className="text-slate-500 text-[10px]">Intercessory</p>
              </div>
            </div>

            {/* Currency */}
            <div>
              <h3 className="text-slate-700 text-sm font-semibold mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" /> Preferred Currency
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => onCurrencyChange(c.code)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left border transition-all',
                      currentCurrency === c.code
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    )}
                  >
                    <span>{c.flag}</span>
                    <span className="flex-1">{c.code}</span>
                    <span className="text-slate-400 text-xs">{c.symbol}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy */}
            <div className="space-y-2">
              <h3 className="text-slate-700 text-sm font-semibold">Privacy & Data</h3>
              <button
                onClick={onOpenPrivacy}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left hover:bg-slate-100"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="flex-1 text-sm text-slate-700">Privacy Policy</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={onExportData}
                className="w-full flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left hover:bg-slate-100"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span className="flex-1 text-sm text-slate-700">Export my data (JSON)</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={onDeleteAccount}
                className="w-full flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-200 text-left hover:bg-red-100"
              >
                <Trash2 className="w-4 h-4 text-red-600" />
                <span className="flex-1 text-sm text-red-600">Delete all data</span>
                <ChevronRight className="w-4 h-4 text-red-400" />
              </button>
            </div>

            {/* About */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center">
              <p className="text-slate-500 text-xs leading-relaxed">
                <span className="text-emerald-700 font-bold">Prayer Fire Movement</span>
                <br />
                A Cure For Prayerlessness.
                <br />
                <span className="text-slate-400">Write it. Speak it. Pray it. Trust God.</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
