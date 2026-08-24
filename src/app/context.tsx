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
  JoinResult,
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

// The official team that always appears first in the group directory.
export const SEED_GROUP_ID = 'group-prayer-fire-movement';

function buildSeedGroup(): PrayerGroup {
  return {
    id: SEED_GROUP_ID,
    name: 'Prayer Fire Movement',
    description: 'The official global prayer team — praying like Daniel, 3× a day.',
    inviteCode: 'PRAYER',
    admins: ['prayerfiremovemnt@gmail.com'],
    members: [],
    prayerTime: '00:00',
    public: true,
    createdAt: new Date().toISOString(),
  };
}

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
  createGroup: (name: string, description: string, prayerTime?: string, isPublic?: boolean) => PrayerGroup;
  joinGroup: (inviteCode: string) => JoinResult;
  requestJoin: (groupId: string) => JoinResult;
  approveMember: (groupId: string, memberName: string) => void;
  rejectMember: (groupId: string, memberName: string) => void;
  setGroupPublic: (groupId: string, isPublic: boolean) => void;
  leaveGroup: (groupId: string) => void;
  deleteGroup: (groupId: string) => void;
  setGroupPrayerTime: (groupId: string, time: string) => void;
  setGroupVerse: (groupId: string, verse: string) => void;
  togglePrayedToday: (groupId: string) => void;
  promoteMember: (groupId: string, memberName: string) => void;
  removeMember: (groupId: string, memberName: string) => void;
  sendMessage: (groupId: string, text: string, kind?: 'message' | 'alert') => void;
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
    if (stored) {
      const parsed = JSON.parse(stored) as PrayerGroup[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    // First visit: seed the official movement team so the directory isn't empty.
    return [buildSeedGroup()];
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

  const createGroup = (name: string, description: string, prayerTime?: string, isPublic = true): PrayerGroup => {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const g: PrayerGroup = {
      id: `group-${Date.now()}`,
      name: name.trim(),
      description: description.trim(),
      inviteCode: code,
      admins: [myId],
      members: [user?.name || 'Me'],
      prayerTime,
      public: isPublic,
      createdAt: new Date().toISOString(),
    };
    setGroups((prev) => [g, ...prev]);
    return g;
  };

  // Shared join logic. Public groups admit immediately; private groups go to
  // a pending list that an admin must approve.
  const applyJoin = (g: PrayerGroup): JoinResult => {
    const memberName = user?.name || 'Guest';
    if (g.members.includes(memberName)) return 'already';
    if (g.pendingMembers?.includes(memberName)) return 'pending';
    if (g.public) {
      setGroups((prev) =>
        prev.map((x) => (x.id === g.id ? { ...x, members: [...x.members, memberName] } : x))
      );
      return 'joined';
    }
    setGroups((prev) =>
      prev.map((x) =>
        x.id === g.id
          ? { ...x, pendingMembers: [...(x.pendingMembers || []), memberName] }
          : x
      )
    );
    return 'pending';
  };

  const joinGroup = (inviteCode: string): JoinResult => {
    const code = inviteCode.trim().toUpperCase();
    const g = groups.find((x) => x.inviteCode.toUpperCase() === code);
    if (!g) return 'notfound';
    return applyJoin(g);
  };

  // Join directly from the directory (by group id).
  const requestJoin = (groupId: string): JoinResult => {
    const g = groups.find((x) => x.id === groupId);
    if (!g) return 'notfound';
    return applyJoin(g);
  };

  // Admins approve / reject join requests on private groups.
  const approveMember = (groupId: string, memberName: string) => {
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const pendingMembers = (g.pendingMembers || []).filter((m) => m !== memberName);
        return { ...g, members: [...g.members, memberName], pendingMembers };
      })
    );
  };

  const rejectMember = (groupId: string, memberName: string) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, pendingMembers: (g.pendingMembers || []).filter((m) => m !== memberName) }
          : g
      )
    );
  };

  // Toggle a group between public and private.
  const setGroupPublic = (groupId: string, isPublic: boolean) => {
    setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, public: isPublic } : g)));
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

  // "I prayed today" — each member can check in once per day.
  const togglePrayedToday = (groupId: string) => {
    const memberKey = user?.name || 'Me';
    const today = new Date().toDateString();
    const group = groups.find((g) => g.id === groupId);
    const currentlyPrayed = group?.prayedToday?.[memberKey] === today;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        const prayedToday = { ...(g.prayedToday || {}) };
        if (prayedToday[memberKey] === today) delete prayedToday[memberKey];
        else prayedToday[memberKey] = today;
        return { ...g, prayedToday };
      })
    );
    // Marking "prayed" also feeds the global fire streak.
    if (!currentlyPrayed) markPrayedToday();
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

  // Expire the free trial after 7 days if the user hasn't subscribed yet.
  useEffect(() => {
    const started = localStorage.getItem(TRIAL_KEY);
    if (!started) return;
    const elapsedDays = (Date.now() - new Date(started).getTime()) / 86400000;
    if (elapsedDays >= TRIAL_DAYS) {
      setIsPremium(false);
      localStorage.removeItem(TRIAL_KEY);
    }
  }, []);

  const upgrade = () => {
    const confirmUpgrade = confirm(
      `Start your 7-Day Free Trial\n\n` +
      `Enjoy the full Prayer Fire Partner experience FREE for 7 days. ` +
      `No charge today — you'll choose a plan after your trial ends.\n\n` +
      `Click OK to start your free trial.`
    );
    if (confirmUpgrade) {
      setIsPremium(true);
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
        requestJoin,
        approveMember,
        rejectMember,
        setGroupPublic,
        leaveGroup,
        deleteGroup,
        setGroupPrayerTime,
        setGroupVerse,
        togglePrayedToday,
        promoteMember,
        removeMember,
        sendMessage,
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
