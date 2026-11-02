/** Tells the top progress bar that a screen change has started (for code that calls router.push itself). */
export const NAV_START_EVENT = 'pfm:nav-start';

export function announceNavigation(): void {
  try {
    window.dispatchEvent(new Event(NAV_START_EVENT));
  } catch {
    // not in a browser
  }
}
