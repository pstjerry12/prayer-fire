import { isCapacitorNative, openInAppBrowser } from './capacitorAlarm';

/**
 * Starts the real Google OAuth flow. Shared by the sign-in wall and the
 * sign-in modal so both behave identically.
 *
 * On Android the flow is flagged as native so the callback can hand the
 * session back to the app via a deep link (Google's consent screen runs in
 * the system browser, a separate cookie jar from the app's WebView). It opens
 * in a Chrome Custom Tab, which overlays the app and closes itself when the
 * deep link fires.
 */
export async function startGoogleSignIn(): Promise<void> {
  const isNative = isCapacitorNative();
  const path = `/api/auth/google/start${isNative ? '?native=1' : ''}`;

  if (isNative) {
    const opened = await openInAppBrowser(`${window.location.origin}${path}`);
    if (opened) return;
  }

  window.location.href = path;
}
