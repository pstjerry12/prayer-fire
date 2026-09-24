// App-wide text size preference. Scales the root font size so every rem-based
// size (text, spacing) grows together. Applied before first paint by the inline
// script in layout.tsx, and live from the Settings screen.

export const TEXT_SCALE_KEY = 'pfm_text_scale';

export const TEXT_SCALE_OPTIONS = [
  { value: 0.9, label: 'Small' },
  { value: 1, label: 'Default' },
  { value: 1.15, label: 'Large' },
  { value: 1.3, label: 'Larger' },
  { value: 1.45, label: 'Largest' },
] as const;

const MIN_SCALE = 0.5;
const MAX_SCALE = 2;

function isValidScale(n: number): boolean {
  return Number.isFinite(n) && n > MIN_SCALE && n < MAX_SCALE;
}

export function getStoredTextScale(): number {
  try {
    const n = parseFloat(localStorage.getItem(TEXT_SCALE_KEY) ?? '');
    return isValidScale(n) ? n : 1;
  } catch {
    return 1;
  }
}

export function applyTextScale(scale: number): void {
  if (typeof document === 'undefined') return;
  document.documentElement.style.fontSize = scale === 1 ? '' : `${scale * 100}%`;
}

export function setTextScale(scale: number): void {
  if (!isValidScale(scale)) return;
  try {
    if (scale === 1) localStorage.removeItem(TEXT_SCALE_KEY);
    else localStorage.setItem(TEXT_SCALE_KEY, String(scale));
  } catch {}
  applyTextScale(scale);
}

// Inline, pre-hydration version of getStoredTextScale + applyTextScale.
export const textScaleScript = `try{var s=parseFloat(localStorage.getItem('${TEXT_SCALE_KEY}'));if(s>${MIN_SCALE}&&s<${MAX_SCALE}){document.documentElement.style.fontSize=(s*100)+'%';}}catch(e){}`;
