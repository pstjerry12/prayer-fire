/**
 * Low-data mode: for people on slow or expensive mobile data. When it is on, the app stops fetching screens in the
 * background, skips video thumbnails and loads smaller things only when they are opened. It is a simple on/off value kept
 * on the phone; other screens ask `isLowData()` before doing optional network work.
 */
export const LOW_DATA_KEY = 'pfm_low_data';

type Connection = { saveData?: boolean; effectiveType?: string };

/** True when the person turned low-data mode on, or the phone/browser itself says "save data" / a very slow network. */
export function isLowData(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (window.localStorage.getItem(LOW_DATA_KEY) === '1') return true;
    const conn = (navigator as Navigator & { connection?: Connection }).connection;
    return !!conn?.saveData || conn?.effectiveType === 'slow-2g' || conn?.effectiveType === '2g';
  } catch {
    return false;
  }
}

/** Only the person's own switch (not the automatic detection), for showing the toggle. */
export function isLowDataSwitchOn(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage.getItem(LOW_DATA_KEY) === '1';
  } catch {
    return false;
  }
}

export function setLowData(on: boolean): void {
  try {
    if (on) window.localStorage.setItem(LOW_DATA_KEY, '1');
    else window.localStorage.removeItem(LOW_DATA_KEY);
    window.dispatchEvent(new Event('pfm-low-data'));
  } catch {
    /* storage unavailable: the switch just does nothing */
  }
}
