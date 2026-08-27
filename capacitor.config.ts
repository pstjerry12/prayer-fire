import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.prayerfire.app',
  appName: 'Prayer Fire Movement',
  // In production, the WebView loads the live Vercel site directly.
  // This means the web app stays on Vercel — Capacitor just wraps it
  // and gives us native alarm/notification powers.
  webDir: 'out',
  server: {
    // Point to the live Vercel site. The native app loads from here,
    // so any updates you deploy to Vercel appear instantly — no app store update needed.
    url: 'https://prayer-fire.vercel.app',
    cleartext: false,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#E05050',
      sound: 'beep.wav',
    },
  },
};

export default config;
