'use client';

import { copyText } from './clipboard';

/** Where a shared verse points people to: the Bible page of the app. */
export const SHARE_URL = 'https://prayer-fire.vercel.app/bible';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

/** "John 3:16 (KJV) - For God so loved… \n\nRead & listen to the Bible free in Prayer Fire: <link>" */
export function shareMessage(verseLine: string): string {
  return `${verseLine}\n\nRead & listen to the Bible free in Prayer Fire: ${SHARE_URL}`;
}

/**
 * Opens the phone's share sheet (WhatsApp, Messages, …) with the verse and a link to the Bible in
 * the app. In the Android app this is the native sheet (Capacitor Share plugin); in a browser it is
 * the Web Share sheet where the browser has one; otherwise the message is copied so it can be pasted.
 */
export async function shareVerse(verseLine: string): Promise<ShareResult> {
  const text = shareMessage(verseLine);
  try {
    // Imported here and used in place: a Capacitor plugin must never be returned from an async function.
    const { Share } = await import('@capacitor/share');
    await Share.share({ title: 'Prayer Fire', text, dialogTitle: 'Share this verse' });
    return 'shared';
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/cancel|abort/i.test(message)) return 'cancelled';
    // No share sheet on this device/browser: fall back to copying the message.
    return (await copyText(text)) ? 'copied' : 'failed';
  }
}
