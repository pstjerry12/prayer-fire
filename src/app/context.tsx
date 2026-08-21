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
  WorshipSong,
  PrayerGroup,
  GroupMessage,
} from '@/app/types';
import { DEFAULT_INTERCESSORY_CATEGORIES } from '@/app/data/bibleVerses';
import { getDefaultCurrency, type Currency } from '@/app/data/pricingPlans';
import type { PrayerAppointment } from '@/app/components/CustomizablePrayerSchedule';
import { getStoredUser, fetchMe, apiLogout, apiDeleteAccount } from '@/lib/authClient';
import { saveSongBlob, deleteSongBlob } from '@/lib/audioStore';

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
  showPricing: boolean;
  setShowPricing: Dispatch<SetStateAction<boolean>>;
  showDailyVerse: boolean;
  setShowDailyVerse: Dispatch<SetStateAction<boolean>>;
  showDailyWisdom: boolean;
  setShowDailyWisdom: Dispatch<SetStateAction<boolean>>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  songs: WorshipSong[];
  addSongFiles: (files: File[]) => Promise<void>;
  addSongUrl: (name: string, url: string) => Promise<void>;
  removeSong: (id: string) => Promise<void>;
  groups: PrayerGroup[];
  messages: GroupMessage[];
  createGroup: (name: string, description: string, prayerTime?: string) => PrayerGroup;
  joinGroup: (inviteCode: string) => boolean;
  leaveGroup: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  setGroupPrayerTime: (groupId: string, time: string) => void;
  setGroupVerse: (groupId: string, verse: string) => void;
  promoteMember: (groupId: string, memberName: string) => void;
  removeMember: (groupId: string, memberName: string) => void;
  sendMessage: (groupId: string, text: string, kind?: 'message' | 'alert') => void;
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
  const [showPricing, setShowPricing] = useState(false);
  const [showDailyVerse, setShowDailyVerse] = useState(false);
  const [showDailyWisdom, setShowDailyWisdom] = useState(false);
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

  // ── Prayer Groups (WhatsApp-style, stored locally) ────────────────
  const [groups, setGroups] = useState<PrayerGroup[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('pfm_groups');
    return stored ? JSON.parse(stored) : [];
  });
  const [messages, setMessages] = useState<GroupMessage[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('pfm_group_messages');
    return stored ? JSON.parse(stored) : [];
  });

  useEffect(() => {
    localStorage.setItem('pfm_groups', JSON.stringify(groups));
  }, [groups]);
  useEffect(() => {
    localStorage.setItem('pfm_group_messages', JSON.stringify(messages));
  }, [messages]);

  const myId = user?.id || 'guest';

  const createGroup = (name: string, description: string, prayerTime?: string): PrayerGroup => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const g: PrayerGroup = {
      id: `group-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      inviteCode: code,
      admins: [myId],
      members: [user?.name || 'Me'],
      prayerTime,
      public: true,
      createdAt: new Date().toISOString(),
    };
    setGroups((prev) => [g, ...prev]);
    return g;
  };

  const joinGroup = (inviteCode: string): boolean => {
    const code = inviteCode.trim().toUpperCase();
    const g = groups.find((x) => x.inviteCode.toUpperCase() === code);
    if (!g) return false;
    const memberName = user?.name || 'Member';
    if (g.members.includes(memberName)) return true;
    setGroups((prev) =>
      prev.map((x) => (x.id === g.id ? { ...x, members: [...x.members, memberName] } : x))
    );
    return true;
  };

  const leaveGroup = (groupId: string) => {
    const memberName = user?.name || 'Member';
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members.filter((m) => m !== memberName), admins: g.admins.filter((a) => a !== myId) }
          : g
      )
    );
  };

  const deleteGroup = (groupId: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setMessages((prev) => prev.filter((m) => m.groupId !== groupId));
  };

  const setGroupPrayerTime = (groupId: string, time: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, prayerTime: time } : g)));
  };

  const setGroupVerse = (groupId: string, verse: string) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, pinnedVerse: verse } : g)));
  };

  const promoteMember = (groupId: string, memberName: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.admins.length >= 3) return g;
        // find a member id by name (best-effort) — for local demo just use name as id
        return { ...g, admins: [...g.admins, memberName] };
      })
    );
  };

  const removeMember = (groupId: string, memberName: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, members: g.members.filter((m) => m !== memberName), admins: g.admins.filter((a) => a !== memberName) }
          : g
      )
    );
  };

  const sendMessage = (groupId: string, text: string, kind: 'message' | 'alert' = 'message') => {
    const m: GroupMessage = {
      id: `msg-${Date.now()}`,
      groupId,
      senderName: user?.name || 'Me',
      senderId: myId,
      text: text.trim(),
      kind,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, m]);
  };

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
        showPricing,
        setShowPricing,
        showDailyVerse,
        setShowDailyVerse,
        showDailyWisdom,
        setShowDailyWisdom,
        theme,
        toggleTheme,
        songs,
        addSongFiles,
        addSongUrl,
        removeSong,
        groups,
        messages,
        createGroup,
        joinGroup,
        leaveGroup,
        deleteGroup,
        setGroupPrayerTime,
        setGroupVerse,
        promoteMember,
        removeMember,
        sendMessage,
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
