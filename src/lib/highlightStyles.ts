import type { HighlightColor } from './studyMerge';

/** Background (translucent) and solid swatch colour for each verse highlight colour. */
export const HIGHLIGHT_STYLES: Record<HighlightColor, { label: string; bg: string; swatch: string }> = {
  orange: { label: 'Orange', bg: 'var(--hl-orange)', swatch: '#fb923c' },
  green: { label: 'Green', bg: 'var(--hl-green)', swatch: '#4ade80' },
  blue: { label: 'Blue', bg: 'var(--hl-blue)', swatch: '#60a5fa' },
  pink: { label: 'Pink', bg: 'var(--hl-pink)', swatch: '#f472b6' },
  purple: { label: 'Purple', bg: 'var(--hl-purple)', swatch: '#a78bfa' },
};

export const BOOKMARK_BG = 'var(--hl-bookmark)';
export const READING_BG = 'var(--hl-reading)';
