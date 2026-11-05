import { KJV_BIBLE_VERSES } from '@/app/data/bibleVerses';

/**
 * What the full-screen prayer alarm (Android) shows under the prayer time: today's prayer point and today's verse.
 * The verse is the same one as the Verse of the Day on Home. The native alarm screen cannot run the web app, so the
 * app hands it the next few days of this ahead of time (see setNativeAlarmContent in capacitorAlarm.ts); it
 * still has fresh content if the app is not opened for a while.
 */
const PRAYER_POINTS = [
  'Thank God for one thing He did for you this week, then ask Him to lead your whole day.',
  'Pray for your family by name. Ask God to protect them and draw each one closer to Him.',
  'Ask the Holy Spirit to give you wisdom and clear direction for the decisions in front of you.',
  'Pray for your church and your pastor: unity, boldness and a heart for people who are lost.',
  'Bring your work, school and money needs to God. Trust Him as your provider.',
  'Pray for healing and strength for someone you know who is sick or tired.',
  'Pray for your nation and its leaders, that there would be peace, justice and an open door for the gospel.',
  'Confess anything weighing on you, receive God\'s forgiveness, and forgive someone who hurt you.',
  'Pray for Christians who are suffering for their faith. Ask God to protect and comfort them.',
  'Worship first: tell God who He is. Then pray for the people He has put on your heart.',
  'Pray for your friends and neighbours who do not know Jesus yet. Ask for one chance to share your faith.',
  'Ask God to renew your strength and joy, and to guard your mind from fear and worry.',
  'Pray over your children and young people everywhere: protect them and call them to Christ.',
  'Pray that God\'s will be done in your life today, and say yes to whatever He asks of you.',
];

/** The phone's local day number (days since 1970). The native side computes the same number. */
export function localDayNumber(date = new Date()): number {
  return Math.floor((date.getTime() - date.getTimezoneOffset() * 60000) / 86400000);
}

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / 86400000);
}

/** One entry per day for the next `days` days, starting today. */
export function buildAlarmContent(days = 14, from = new Date()) {
  const items: { day: number; point: string; verse: string; reference: string }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12);
    const verse = KJV_BIBLE_VERSES[dayOfYear(d) % KJV_BIBLE_VERSES.length];
    items.push({
      day: localDayNumber(d),
      point: PRAYER_POINTS[localDayNumber(d) % PRAYER_POINTS.length],
      verse: verse.text,
      reference: verse.reference,
    });
  }
  return items;
}
