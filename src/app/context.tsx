'use client';

import {
  createContext,
  useContext,
  useEffect,
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
} from '@/app/types';
import { DEFAULT_INTERCESSORY_CATEGORIES } from '@/app/data/bibleVerses';
import { getDefaultCurrency, type Currency } from '@/app/data/pricingPlans';
import type { PrayerAppointment } from '@/app/components/CustomizablePrayerSchedule';
import { getStoredUser, fetchMe, apiLogout, apiDeleteAccount } from '@/lib/authClient';

const DEFAULT_APPOINTMENTS: PrayerAppointment[] = [
  { id: 'midnight', time: '00:00', label: 'Midnight Hour', enabled: true },
  { id: 'noon', time: '12:00', label: 'Noon Prayer', enabled: true },
  { id: 'morning', time: '04:00', label: 'Morning Watch', enabled: true },
];

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
  isPremium: boolean;
  setIsPremium: Dispatch<SetStateAction<boolean>>;
  currency: Currency;
  setCurrency: Dispatch<SetStateAction<Currency>>;
  user: AuthUser | null;
  setUser: Dispatch<SetStateAction<AuthUser | null>>;
  showAuth: boolean;
  setShowAuth: Dispatch<SetStateAction<boolean>>;
  showPrivacy: boolean;
  setShowPrivacy: Dispatch<SetStateAction<boolean>>;
  showSettings: boolean;
  setShowSettings: Dispatch<SetStateAction<boolean>>;
  showDailyVerse: boolean;
  setShowDailyVerse: Dispatch<SetStateAction<boolean>>;
  showDailyWisdom: boolean;
  setShowDailyWisdom: Dispatch<SetStateAction<boolean>>;
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
    return stored ? JSON.parse(stored) : DEFAULT_APPOINTMENTS;
  });
  const [streak, setStreak] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const stored = localStorage.getItem('upp_streak_count');
    return stored ? parseInt(stored) : 0;
  });
  const [isPremium, setIsPremium] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('upp_is_premium') === 'true';
  });
  const [currency, setCurrency] = useState<Currency>(() => {
    if (typeof window === 'undefined') return 'USD';
    const stored = localStorage.getItem('preferred_currency') as Currency;
    return stored || getDefaultCurrency();
  });
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDailyVerse, setShowDailyVerse] = useState(false);
  const [showDailyWisdom, setShowDailyWisdom] = useState(false);

  // Restore / verify session
  useEffect(() => {
    (async () => {
      const stored = getStoredUser();
      if (stored) setUser(stored);
      const me = await fetchMe();
      if (me) setUser(me);
      setAuthChecked(true);
    })();
  }, []);

  // Prompt to sign in once per device (after daily devotionals)
  useEffect(() => {
    if (!authChecked || user) return;
    if (showDailyVerse || showDailyWisdom) return;
    if (typeof window !== 'undefined' && localStorage.getItem('pfm_auth_prompted')) return;
    setShowAuth(true);
    localStorage.setItem('pfm_auth_prompted', '1');
  }, [authChecked, user, showDailyVerse, showDailyWisdom]);

  // Daily devotionals
  useEffect(() => {
    const lastDailyShown = localStorage.getItem('upp_daily_devotion_shown');
    const today = new Date().toDateString();
    if (lastDailyShown !== today) setShowDailyVerse(true);
  }, []);

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
    localStorage.setItem('upp_is_premium', isPremium.toString());
  }, [isPremium]);
  useEffect(() => {
    localStorage.setItem('preferred_currency', currency);
  }, [currency]);

  // Update streak
  useEffect(() => {
    const lastPrayer = localStorage.getItem('upp_last_prayer_date');
    const today = new Date().toDateString();
    if (lastPrayer !== today) {
      const newStreak = lastPrayer === new Date(Date.now() - 86400000).toDateString() ? streak + 1 : 1;
      setStreak(newStreak);
      localStorage.setItem('upp_streak_count', String(newStreak));
      localStorage.setItem('upp_last_prayer_date', today);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await apiLogout();
    setUser(null);
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

  const upgrade = () => {
    const confirmUpgrade = confirm(
      `Payment Integration Demo\n\n` +
      `In production, this will redirect you to Paystack/Stripe checkout, ` +
      `verify payment securely, and activate your Prayer Fire Partner subscription.\n\n` +
      `For this demo, click OK to activate your subscription.`
    );
    if (confirmUpgrade) {
      setIsPremium(true);
      alert('🎉 Welcome to Prayer Fire Partner! Your premium features are now active.');
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
        setIsPremium,
        currency,
        setCurrency,
        user,
        setUser,
        showAuth,
        setShowAuth,
        showPrivacy,
        setShowPrivacy,
        showSettings,
        setShowSettings,
        showDailyVerse,
        setShowDailyVerse,
        showDailyWisdom,
        setShowDailyWisdom,
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
