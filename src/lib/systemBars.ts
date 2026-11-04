import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

/**
 * Keeps the Android status-bar icons (clock, battery, signal) readable. The top bar is deep evergreen in BOTH light and
 * dark mode, so the icons are always light. Takes the theme anyway so a call site does not need to change if that ever
 * does. It does nothing in a browser, and nothing on an old build that lacks the native piece.
 */
export function syncSystemBars(_dark: boolean): void {
  try {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('SystemBars')) return;
    SystemBars.setStyle({ style: SystemBarsStyle.Dark }).catch(() => {});
  } catch {
    // not available: the phone's own setting is used
  }
}

/** Tells the browser (and an installed web app) the colour of the top bar, so its own bar matches the page. */
export function syncThemeColorMeta(dark: boolean): void {
  try {
    const colour = dark ? '#052e22' : '#053d2e'; // the top bar's colour
    let tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'theme-color';
      document.head.appendChild(tag);
    }
    tag.content = colour;
  } catch {
    // ignore
  }
}
