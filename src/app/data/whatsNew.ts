// "What's New" release notes, newest first.
//
// To announce an update: add a new entry at the TOP with a new unique `id`
// (the date is a good id). Everyone who has used the app before sees it once,
// the next time they open the app. Brand-new installs skip it.

export interface WhatsNewRelease {
  id: string;
  date: string;
  title: string;
  items: { emoji: string; text: string }[];
}

export const WHATS_NEW: WhatsNewRelease[] = [
  {
    id: '2026-09-25',
    date: 'September 2026',
    title: 'Easier reading & a quieter alarm',
    items: [
      { emoji: '🔠', text: 'New Text Size setting — tap “Aa” at the bottom of the screen (or open Settings) to make words bigger across the whole app, including the Bible and your prayer points.' },
      { emoji: '⏰', text: 'Tapping “Stop” on the prayer alarm now stops it for good — it no longer rings again when you open the app.' },
      { emoji: '🛑', text: 'The alarm notification now has its own Stop button, so you can silence it right from the notification.' },
      { emoji: '🔑', text: 'Google sign-in now returns you straight to the app.' },
      { emoji: '💝', text: 'Giving through Flutterwave is now live and confirmed automatically.' },
      { emoji: '🔥', text: 'The app is now called “Prayer Fire”. The Prayer Fire Movement group is still here for everyone.' },
      { emoji: '🔔', text: 'You’ll see this screen after every update, so you always know what’s new.' },
    ],
  },
];

export const WHATS_NEW_SEEN_KEY = 'pfm_whats_new_seen';

export const LATEST_RELEASE: WhatsNewRelease | undefined = WHATS_NEW[0];
