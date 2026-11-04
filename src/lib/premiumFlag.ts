/**
 * A tiny note on the phone of whether this person had Partner or Leader (or Free Premium Mode) the last time the app
 * checked. Plain functions that run outside React (like getSelectedTranslation) read it to know which Bible translations
 * to offer, without waiting for the sign-in check at start-up. The app updates it after every check (see context.tsx);
 * real enforcement of paid features that live on the server is done there, not from this note.
 */
const KEY = 'pfm_premium';

export function getPremiumFlag(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setPremiumFlag(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? '1' : '0');
  } catch {
    // storage unavailable: Free rules apply next time
  }
}
