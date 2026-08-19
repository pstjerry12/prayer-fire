'use client';

import { useEffect, type ReactNode } from 'react';
import { AppProvider, useApp } from './context';
import AuthModal from './components/AuthModal';
import AccountSettings from './components/AccountSettings';
import PrivacyPolicy from './components/PrivacyPolicy';
import DailyVerseModal from './components/DailyVerseModal';
import DailyWisdomModal from './components/DailyWisdomModal';
import BottomNav from './components/BottomNav';
import PrayerAlarm from './components/PrayerAlarm';
import SplashScreen from './components/SplashScreen';
import NotificationPermission from './components/NotificationPermission';

function Overlays() {
  const {
    user,
    setUser,
    prayers,
    intercessoryPrayers,
    streak,
    currency,
    setCurrency,
    signOut,
    deleteAccount,
    exportData,
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
  } = useApp();

  const handleDailyVerseClose = () => {
    setShowDailyVerse(false);
    setShowDailyWisdom(true);
  };

  const handleDailyWisdomClose = () => {
    setShowDailyWisdom(false);
    localStorage.setItem('upp_daily_devotion_shown', new Date().toDateString());
  };

  const anyModalOpen = showAuth || showPrivacy || showSettings || showDailyVerse || showDailyWisdom;

  return (
    <>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={(u) => { setUser(u); setShowAuth(false); }} />
      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <AccountSettings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        prayerCount={prayers.length}
        intercessoryCount={intercessoryPrayers.length}
        streakCount={streak}
        currentCurrency={currency}
        onCurrencyChange={setCurrency}
        onDeleteAccount={deleteAccount}
        onExportData={exportData}
        user={user}
        onSignIn={() => setShowAuth(true)}
        onSignOut={signOut}
        onOpenPrivacy={() => setShowPrivacy(true)}
      />
      <DailyVerseModal isOpen={showDailyVerse} onClose={handleDailyVerseClose} />
      <DailyWisdomModal isOpen={showDailyWisdom} onClose={handleDailyWisdomClose} />
      {!anyModalOpen && <BottomNav />}
    </>
  );
}

function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    try {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    } catch {
      // ignore
    }
  }, []);
  return null;
}

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <SplashScreen />
      <ServiceWorkerRegister />
      <PrayerAlarm />
      <NotificationPermission />
      {children}
      <Overlays />
    </AppProvider>
  );
}
