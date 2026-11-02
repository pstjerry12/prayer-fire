import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core';

/**
 * Keeps the Android status-bar icons (clock, battery, signal) readable: dark icons on the light top bar, light icons on
 * the night one. The app's own light/dark choice can differ from the phone's setting, so this follows the app. It does
 * nothing in a browser, and nothing on an old build that lacks the native piece.
 */
export function syncSystemBars(dark: boolean): void {
  try {
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable('SystemBars')) return;
    SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
  } catch {
    // not available: the phone's own setting is used
  }
}

/** Tells the browser (and an installed web app) the colour of the top bar, so its own bar matches the page. */
export function syncThemeColorMeta(dark: boolean): void {
  try {
    const colour = dark ? '#0e1628' : '#faf7f2';
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
