import type { Sermon, SermonEntry } from './studyMerge';
import { formatVerse } from './study';
import { getTranslationMeta, type TranslationId } from './bible/translations';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** "Studied today", "Yesterday", "Monday" (this week), otherwise "12 Oct 2026". */
export function studyDayLabel(timestamp: number, now = new Date()): string {
  const days = Math.round((startOfDay(now) - startOfDay(new Date(timestamp))) / 86_400_000);
  if (days <= 0) return 'Studied today';
  if (days === 1) return 'Yesterday';
  const d = new Date(timestamp);
  if (days < 7) return WEEKDAYS[d.getDay()];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2026-10-18" → "18 Oct 2026". */
export function formatSermonDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${parseInt(m[3], 10)} ${MONTHS[parseInt(m[2], 10) - 1] ?? ''} ${m[1]}`;
}

function translationShort(id: string): string {
  try {
    return getTranslationMeta(id as TranslationId).shortName;
  } catch {
    return id.toUpperCase();
  }
}

export function entryShortName(entry: Pick<SermonEntry, 'translationId'>): string {
  return translationShort(entry.translationId);
}

/** A sermon as plain text, to copy or share as a list. */
export function sermonAsText(sermon: Sermon, entries: SermonEntry[]): string {
  const lines: string[] = [sermon.title];
  const who = [sermon.preacher, formatSermonDate(sermon.date)].filter(Boolean).join(' · ');
  if (who) lines.push(who);
  lines.push('');
  entries.forEach((e, i) => {
    lines.push(`${i + 1}. ${formatVerse(e.reference, translationShort(e.translationId), e.text)}`);
    if (e.note.trim()) lines.push(`   Note: ${e.note.trim()}`);
  });
  return lines.join('\n');
}
