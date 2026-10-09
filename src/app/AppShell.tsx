'use client';

import { useEffect, type ReactNode } from 'react';
import { AppProvider, useApp } from './context';
import AuthModal from './components/AuthModal';
import AccountSettings from './components/AccountSettings';
import PrivacyPolicy from './components/PrivacyPolicy';
import DailyVerseModal from './components/DailyVerseModal';
import DailyWisdomModal from './components/DailyWisdomModal';
import WhatsNewModal from './components/WhatsNewModal';
import FeedbackModal from './components/FeedbackModal';
import UpdateBanner from './components/UpdateBanner';
import BottomNav from './components/BottomNav';
import PrayerAlarm from './components/PrayerAlarm';
import SplashScreen from './components/SplashScreen';
import NotificationPermission from './components/NotificationPermission';
import PricingPage from './components/PricingPage';
import BackButtonExit from './components/BackButtonExit';
import PullToRefresh from './components/PullToRefresh';
import RouteMemory from './components/RouteMemory';
import SessionGuard from './components/SessionGuard';
import SignInGate, { useSignInRequired } from './components/SignInGate';

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
    showPricing,
    setShowPricing,
    showDailyVerse,
    setShowDailyVerse,
    showDailyWisdom,
    setShowDailyWisdom,
    showWhatsNew,
    closeWhatsNew,
    openWhatsNew,
    showFeedback,
    setShowFeedback,
    upgrade,
  } = useApp();

  const signInRequired = useSignInRequired();

  const handleDailyVerseClose = () => {
    setShowDailyVerse(false);
    setShowDailyWisdom(true);
  };

  const handleDailyWisdomClose = () => {
    setShowDailyWisdom(false);
    localStorage.setItem('upp_daily_devotion_shown', new Date().toDateString());
  };

  const anyModalOpen = showAuth || showPrivacy || showSettings || showPricing || showDailyVerse || showDailyWisdom || showWhatsNew || showFeedback;

  return (
    <>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} onSuccess={(u) => { setUser(u); setShowAuth(false); }} />
      <PrivacyPolicy isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
      <PricingPage isOpen={showPricing} onClose={() => setShowPricing(false)} onSelectPlan={upgrade} />
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
        onOpenWhatsNew={() => { setShowSettings(false); openWhatsNew(); }}
        onSendFeedback={() => { setShowSettings(false); setShowFeedback(true); }}
      />
      <DailyVerseModal isOpen={showDailyVerse} onClose={handleDailyVerseClose} />
      <DailyWisdomModal isOpen={showDailyWisdom} onClose={handleDailyWisdomClose} />
      <WhatsNewModal
        isOpen={showWhatsNew}
        onClose={closeWhatsNew}
        onSendFeedback={() => { closeWhatsNew(); setShowFeedback(true); }}
      />
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} user={user} />
      {!anyModalOpen && !signInRequired && <BottomNav />}
    </>
  );
}

// The alarm-permission banner waits until the person has signed in, so the
// very first screen is just the sign-in wall.
function GatedNotificationPermission() {
  const signInRequired = useSignInRequired();
  return signInRequired ? null : <NotificationPermission />;
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
      <RouteMemory />
      <SessionGuard />
      <PrayerAlarm />
      <GatedNotificationPermission />
      <UpdateBanner />
      <BackButtonExit />
      <PullToRefresh>{children}</PullToRefresh>
      <SignInGate />
      <Overlays />
    </AppProvider>
  );
}
