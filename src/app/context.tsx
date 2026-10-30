'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import type {
  PrayerPoint,
  IntercessoryPrayer,
  PartnerRequest,
  IntercessoryCategory,
  AuthUser,
  WorshipSong,
  SubscriptionInfo,
  FreeModeInfo,
} from '@/app/types';
import { DEFAULT_INTERCESSORY_CATEGORIES } from '@/app/data/bibleVerses';
import { getDefaultCurrency, type Currency } from '@/app/data/pricingPlans';
import type { PrayerAppointment } from '@/app/components/CustomizablePrayerSchedule';
import { getStoredUser, checkSession, clearSession, apiLogout, apiDeleteAccount, storeSession, setLastLogin } from '@/lib/authClient';
import { saveSongBlob, deleteSongBlob } from '@/lib/audioStore';
import { listenAuthDeepLink, closeInAppBrowser } from '@/lib/capacitorAlarm';
import { applyTextScale, getStoredTextScale } from '@/lib/textScale';
import { useAndroidApp } from '@/lib/useAndroidApp';
import { LATEST_RELEASE, WHATS_NEW_SEEN_KEY } from './data/whatsNew';

// useNativeAlarm defaults to true so every user gets the loud, full-screen
// "ring like an alarm" experience out of the box (Android only — a no-op
// elsewhere) instead of requiring them to discover a per-prayer toggle.
const DEFAULT_APPOINTMENTS: PrayerAppointment[] = [
  { id: 'midnight', time: '00:00', label: 'Midnight Hour', enabled: true, useNativeAlarm: true },
  { id: 'noon', time: '12:00', label: 'Noon Prayer', enabled: true, useNativeAlarm: true },
  { id: 'morning', time: '04:00', label: 'Morning Watch', enabled: true, useNativeAlarm: true },
];

// 7-day free trial for the premium (Prayer Fire Partner) features.
const TRIAL_KEY = 'upp_trial_start';
const TRIAL_DAYS = 7;

// The "fire streak" counts consecutive days with at least one prayer check-in.
const PRAYED_DATES_KEY = 'upp_prayed_dates';

function computeStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  const d = new Date();
  // If today isn't marked yet, the streak continues from yesterday.
  if (!set.has(d.toDateString())) d.setDate(d.getDate() - 1);
  while (set.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function readPrayedDates(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRAYED_DATES_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

interface AppContextValue {
  prayers: PrayerPoint[];
  setPrayers: Dispatch<SetStateAction<PrayerPoint[]>>;
  intercessoryPrayers: IntercessoryPrayer[];
  setIntercessoryPrayers: Dispatch<SetStateAction<IntercessoryPrayer[]>>;
  categories: IntercessoryCategory[];
  setCategories: Dispatch<SetStateAction<IntercessoryCategory[]>>;
  partnerRequests: PartnerRequest[];
  setPartnerRequests: Dispatch<SetStateAction<PartnerRequest[]>>;
  appointments: PrayerAppointment[];
  setAppointments: Dispatch<SetStateAction<PrayerAppointment[]>>;
  streak: number;
  /**
   * Partner features are unlocked: the paid subscription (from the server), or Free Premium Mode (set by
   * the admin), or, on the WEB only, the free 7-day trial kept on the device (the Android app uses Google Play's own trial).
   */
  isPremium: boolean;
  /** Leader features (creating and managing prayer groups): a Leader subscription, or Free Premium Mode. */
  isLeader: boolean;
  /** "Premium is free for a limited time" is on for everyone right now. */
  freeMode: FreeModeInfo;
  /** Sets the on-device free-trial flag (web only; ignored in the Android app). */
  setIsPremium: Dispatch<SetStateAction<boolean>>;
  /** The paid Prayer Fire Partner subscription, as the server reports it (null = none). */
  subscription: SubscriptionInfo | null;
  /** Asks the server again and updates `subscription`; returns the new value. */
  refreshSubscription: () => Promise<SubscriptionInfo | null>;
  /** True only inside the Android app. */
  isAndroidApp: boolean;
  currency: Currency;
  setCurrency: Dispatch<SetStateAction<Currency>>;
  user: AuthUser | null;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  /** True once the first sign-in check (stored session + server) has finished. */
  authChecked: boolean;
  showAuth: boolean;
  setShowAuth: Dispatch<SetStateAction<boolean>>;
  showPrivacy: boolean;
  setShowPrivacy: Dispatch<SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: Dispatch<SetStateAction<boolean>>;
  showPricing: boolean;
  setShowPricing: Dispatch<SetStateAction<boolean>>;
  showDailyVerse: boolean;
  setShowDailyVerse: Dispatch<SetStateAction<boolean>>;
  showDailyWisdom: boolean;
  setShowDailyWisdom: Dispatch<SetStateAction<boolean>>;
  showWhatsNew: boolean;
  showFeedback: boolean;
  setShowFeedback: Dispatch<SetStateAction<boolean>>;
  openWhatsNew: () => void;
  closeWhatsNew: () => void;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  songs: WorshipSong[];
  addSongFiles: (files: File[]) => Promise<void>;
  addSongUrl: (name: string, url: string) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  markPrayedToday: () => void;
  signOut: () => Promise<void>;
  deleteAccount: () => void;
  exportData: () => void;
  upgrade: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [prayers, setPrayers] = useState<PrayerPoint[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upp_prayer_points');
    return stored ? JSON.parse(stored) : [];
  });
  const [intercessoryPrayers, setIntercessoryPrayers] = useState<IntercessoryPrayer[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upp_intercessory_prayers');
    return stored ? JSON.parse(stored) : [];
  });
  const [categories, setCategories] = useState<IntercessoryCategory[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_INTERCESSORY_CATEGORIES;
    const stored = localStorage.getItem('upp_intercessory_categories');
    return stored ? JSON.parse(stored) : DEFAULT_INTERCESSORY_CATEGORIES;
  });
  const [partnerRequests, setPartnerRequests] = useState<PartnerRequest[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upp_partner_requests');
    return stored ? JSON.parse(stored) : [];
  });
  const [appointments, setAppointments] = useState<PrayerAppointment[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_APPOINTMENTS;
    const stored = localStorage.getItem('upp_prayer_appointments');
    if (!stored) return DEFAULT_APPOINTMENTS;
    const parsed: PrayerAppointment[] = JSON.parse(stored);
    // One-time migration for testers who installed before useNativeAlarm
    // defaulted to true: turn it on for the three built-in prayer times if
    // they never explicitly set it (undefined, not false — an explicit
    // false means the user deliberately turned it off, which stays as-is).
    const DEFAULT_IDS = new Set(DEFAULT_APPOINTMENTS.map((a) => a.id));
    return parsed.map((a) =>
      DEFAULT_IDS.has(a.id) && a.useNativeAlarm === undefined
        ? { ...a, useNativeAlarm: true }
        : a
    );
  });
  const [streak, setStreak] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem('upp_streak_count');
    return stored ? parseInt(stored) : 0;
  });
  const [localPremium, setLocalPremium] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('upp_is_premium') === 'true';
  });
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window === 'undefined') return 'USD';
    const stored = localStorage.getItem('preferred_currency') as Currency;
    return stored || getDefaultCurrency();
  });
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [freeMode, setFreeMode] = useState<FreeModeInfo>({ active: false, endsAt: null });
  const androidApp = useAndroidApp();
  const isPremium = freeMode.active || subscription !== null || (!androidApp && localPremium);
  const isLeader = freeMode.active || subscription?.tier === 'leader';
  const [authChecked, setAuthChecked] = useState(false);
  const authEpochRef = useRef(0); // bumps on every sign-out, to discard stale session checks
  const [showAuth, setShowAuth] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showDailyVerse, setShowDailyVerse] = useState(false);
  const [showDailyWisdom, setShowDailyWisdom] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [whatsNewPending, setWhatsNewPending] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('pfm_theme') === 'dark' ? 'dark' : 'light';
  });
  const [songs, setSongs] = useState<WorshipSong[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('upp_worship_songs');
    return stored ? JSON.parse(stored) : [];
  });

  // Apply + persist theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem('pfm_theme', theme);
  }, [theme]);

  // Re-apply the saved text size after hydration (the pre-paint script's inline
  // style on <html> is dropped if React has to re-render the root).
  useEffect(() => {
    applyTextScale(getStoredTextScale());
  }, []);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  // Persist worship-song metadata (audio blobs live in IndexedDB)
  useEffect(() => {
    localStorage.setItem('upp_worship_songs', JSON.stringify(songs));
  }, [songs]);

  const addSongFiles = async (files: File[]) => {
    const incoming: WorshipSong[] = [];
    for (const file of files) {
      const id = `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      await saveSongBlob(id, file);
      incoming.push({
        id,
        name: file.name.replace(/\.[^.]+$/, '') || 'Worship Song',
        source: 'file',
        addedAt: new Date().toISOString(),
      });
    }
    setSongs((prev) => [...incoming, ...prev]);
  };

  const addSongUrl = async (name: string, url: string) => {
    setSongs((prev) => [
      { id: `song-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, name: name.trim() || 'Worship Song', url, source: 'url', addedAt: new Date().toISOString() },
      ...prev,
    ]);
  };

  const removeSong = async (id: string) => {
    setSongs((prev) => prev.filter((s) => s.id !== id));
    await deleteSongBlob(id).catch(() => {});
  };

  // Remember who signed in, so the sign-in form can pre-fill them next time.
  useEffect(() => {
    if (!user) return;
    const id = user.email || user.phone;
    if (id) setLastLogin({ id, method: user.provider === 'google' ? 'google' : 'password', name: user.name });
  }, [user]);

  // Restore / verify session
  useEffect(() => {
    (async () => {
      const epoch = authEpochRef.current;
      const stored = getStoredUser();
      if (stored) setUser(stored);
      const check = await checkSession();
      // Signed out (e.g. the idle sign-out) while this check was in flight:
      // don't let a stale "ok" answer sign the person straight back in.
      if (epoch !== authEpochRef.current) {
        setAuthChecked(true);
        return;
      }
      if (check.status === 'ok') {
        setUser(check.user);
        setSubscription(check.subscription);
        setFreeMode(check.freeMode);
      } else if (check.status === 'invalid' && stored) {
        // The server says this session has expired (or the account is gone):
        // drop it so the sign-in wall asks again instead of leaving a
        // "signed-in" app whose requests all fail. Offline/server errors keep
        // the stored session.
        clearSession();
        setUser(null);
        setSubscription(null);
        setFreeMode({ active: false, endsAt: null });
      }
      setAuthChecked(true);
    })();
  }, []);

  // Pick up the session Google sign-in hands back via a deep link on
  // Android (see listenAuthDeepLink / api/auth/google/callback) — the
  // native app's WebView never sees the cookie Google's consent screen
  // sets in the system browser, so the token comes back this way instead.
  useEffect(() => {
    let cleanup: (() => void) | undefined;
    listenAuthDeepLink(async (url) => {
      // Whatever the outcome, the Custom Tab opened for Google sign-in has
      // done its job the moment this deep link fires — close it so the
      // user lands back on the app instead of a leftover browser tab, and
      // dismiss the sign-in modal so a successful login doesn't leave it
      // sitting on top of the now-signed-in app.
      closeInAppBrowser();
      setShowAuth(false);

      let token: string | null = null;
      try {
        token = new URL(url).searchParams.get('token');
      } catch {
        return;
      }
      if (!token) return;
      try {
        const res = await fetch('/api/auth/me', {
          cache: 'no-store',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = (await res.json()) as { user: AuthUser | null; subscription?: SubscriptionInfo | null; freeMode?: FreeModeInfo };
        if (data.user) {
          storeSession(token, data.user);
          setUser(data.user);
          setSubscription(data.subscription ?? null);
          setFreeMode(data.freeMode ?? { active: false, endsAt: null });
        }
      } catch {
        // ignore
      }
    }).then((fn) => { cleanup = fn; });
    return () => cleanup?.();
  }, []);

  // Daily devotionals + "What's New" after an update
  useEffect(() => {
    const lastDailyShown = localStorage.getItem('upp_daily_devotion_shown');
    const today = new Date().toDateString();
    if (lastDailyShown !== today) setShowDailyVerse(true);

    if (LATEST_RELEASE && localStorage.getItem(WHATS_NEW_SEEN_KEY) !== LATEST_RELEASE.id) {
      // Existing users get the release notes; a brand-new install (never
      // finished a daily devotional) starts fresh without them.
      if (lastDailyShown) setWhatsNewPending(true);
      else localStorage.setItem(WHATS_NEW_SEEN_KEY, LATEST_RELEASE.id);
    }
  }, []);

  // Show "What's New" once the daily devotionals are out of the way
  useEffect(() => {
    if (whatsNewPending && !showDailyVerse && !showDailyWisdom) setShowWhatsNew(true);
  }, [whatsNewPending, showDailyVerse, showDailyWisdom]);

  const openWhatsNew = () => setShowWhatsNew(true);
  const closeWhatsNew = () => {
    setShowWhatsNew(false);
    setWhatsNewPending(false);
    if (LATEST_RELEASE) localStorage.setItem(WHATS_NEW_SEEN_KEY, LATEST_RELEASE.id);
  };

  // Persist data
  useEffect(() => {
    localStorage.setItem('upp_prayer_points', JSON.stringify(prayers));
  }, [prayers]);
  useEffect(() => {
    localStorage.setItem('upp_intercessory_prayers', JSON.stringify(intercessoryPrayers));
  }, [intercessoryPrayers]);
  useEffect(() => {
    localStorage.setItem('upp_intercessory_categories', JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem('upp_partner_requests', JSON.stringify(partnerRequests));
  }, [partnerRequests]);
  useEffect(() => {
    localStorage.setItem('upp_prayer_appointments', JSON.stringify(appointments));
  }, [appointments]);
  useEffect(() => {
    localStorage.setItem('upp_is_premium', localPremium.toString());
  }, [localPremium]);
  useEffect(() => {
    localStorage.setItem('preferred_currency', currency);
  }, [currency]);

  // Migrate from the old streak model (app-open based) to the prayer-based model,
  // then recompute the streak from actual prayer check-ins.
  useEffect(() => {
    const dates = readPrayedDates();
    if (dates.length === 0) {
      const oldLast = localStorage.getItem('upp_last_prayer_date');
      const oldCount = parseInt(localStorage.getItem('upp_streak_count') || '0', 10);
      if (oldLast && oldCount > 0) {
        const migrated: string[] = [];
        const d = new Date(oldLast);
        for (let i = 0; i < oldCount; i++) {
          migrated.push(d.toDateString());
          d.setDate(d.getDate() - 1);
        }
        localStorage.setItem(PRAYED_DATES_KEY, JSON.stringify(migrated));
      }
    }
    setStreak(computeStreak(readPrayedDates()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the display value in sync for the Navbar / AccountSettings.
  useEffect(() => {
    localStorage.setItem('upp_streak_count', String(streak));
  }, [streak]);

  // Mark "I prayed today" — used by the daily schedule check-ins and prayer groups.
  const markPrayedToday = () => {
    if (typeof window === 'undefined') return;
    const dates = readPrayedDates();
    const today = new Date().toDateString();
    if (!dates.includes(today)) dates.push(today);
    localStorage.setItem(PRAYED_DATES_KEY, JSON.stringify(dates));
    setStreak(computeStreak(dates));
  };

  const signOut = async () => {
    authEpochRef.current += 1;
    await apiLogout();
    setUser(null);
    setSubscription(null);
    setFreeMode({ active: false, endsAt: null });
  };

  const deleteAccount = () => {
    if (!confirm('Are you absolutely sure? This will delete ALL your data permanently.')) return;
    if (user) apiDeleteAccount().catch(() => {});
    localStorage.clear();
    window.location.reload();
  };

  const exportData = () => {
    const data = {
      exportDate: new Date().toISOString(),
      prayers,
      intercessoryPrayers,
      categories,
      appointments,
      streak,
      isPremium,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prayer-fire-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Expire the free trial after 7 days if the user hasn't subscribed yet.
  useEffect(() => {
    const started = localStorage.getItem(TRIAL_KEY);
    if (!started) return;
    const elapsedDays = (Date.now() - new Date(started).getTime()) / 86400000;
    if (elapsedDays >= TRIAL_DAYS) {
      setLocalPremium(false);
      localStorage.removeItem(TRIAL_KEY);
    }
  }, []);

  const refreshSubscription = async (): Promise<SubscriptionInfo | null> => {
    const check = await checkSession();
    if (check.status === 'ok') {
      setSubscription(check.subscription);
      setFreeMode(check.freeMode);
      return check.subscription;
    }
    return null;
  };

  // A subscription can end (or be renewed) while the app stays open in the background:
  // ask the server again when the person comes back to the app, at most every 10 minutes.
  const lastSubCheck = useRef(0);
  useEffect(() => {
    if (!user) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastSubCheck.current < 10 * 60 * 1000) return;
      lastSubCheck.current = Date.now();
      checkSession().then((check) => {
        if (check.status === 'ok') {
          setSubscription(check.subscription);
          setFreeMode(check.freeMode);
        }
      });
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [user]);

  const upgrade = () => {
    // In the Android app the only way to subscribe is Google Play: open the subscription screen.
    if (androidApp) {
      setShowPricing(true);
      return;
    }
    const confirmUpgrade = confirm(
      `Start your 7-Day Free Trial\n\n` +
      `Enjoy the full Prayer Fire Partner experience FREE for 7 days. ` +
      `No charge today — you'll choose a plan after your trial ends.\n\n` +
      `Click OK to start your free trial.`
    );
    if (confirmUpgrade) {
      setLocalPremium(true);
      localStorage.setItem(TRIAL_KEY, new Date().toISOString());
      alert('🎉 Your 7-day free trial has started! Enjoy full access.');
    }
  };

  return (
    <AppContext.Provider
      value={{
        prayers,
        setPrayers,
        intercessoryPrayers,
        setIntercessoryPrayers,
        categories,
        setCategories,
        partnerRequests,
        setPartnerRequests,
        appointments,
        setAppointments,
        streak,
        isPremium,
        isLeader,
        freeMode,
        setIsPremium: setLocalPremium,
        subscription,
        refreshSubscription,
        isAndroidApp: androidApp,
        currency,
        setCurrency,
        user,
        setUser,
        authChecked,
        showAuth,
        setShowAuth,
        showPrivacy,
        setShowPrivacy,
        showSettings,
        setShowSettings,
        showPricing,
        setShowPricing,
        showDailyVerse,
        setShowDailyVerse,
        showDailyWisdom,
        setShowDailyWisdom,
        showWhatsNew,
        showFeedback,
        setShowFeedback,
        openWhatsNew,
        closeWhatsNew,
        theme,
        toggleTheme,
        songs,
        addSongFiles,
        addSongUrl,
        removeSong,
        markPrayedToday,
        signOut,
        deleteAccount,
        exportData,
        upgrade,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
