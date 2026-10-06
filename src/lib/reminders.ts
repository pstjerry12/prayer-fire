// Helpers for Admin → Feedback → Daily activity: phone normalising/matching,
// parsing a pasted tester list, and building WhatsApp / email reminder links.
// Pure functions (no DOM, no DB) so the API route and the admin page share them.

const DEFAULT_DIAL = '234'; // Nigeria — where most testers are

export const DEFAULT_REMINDER_TEMPLATE =
  'Hi {name} 🙏 this is Pastor Jerry C. from Prayer Fire. Please open the app today and sign in, ' +
  'and tell us what you think with Settings → Send Feedback. Thank you for helping us improve!';

export const digitsOnly = (s: string | null | undefined): string => (s ?? '').replace(/\D/g, '');

/**
 * Full international digits (no "+") for a phone number — what wa.me wants.
 * `dial` is the stored country dial code (e.g. "+234"); when it's unknown we
 * assume Nigeria. A leading 0 (local format) is replaced by the dial code.
 */
export function fullPhone(phone: string | null | undefined, dial?: string | null): string {
  let d = digitsOnly(phone);
  if (!d) return '';
  if (d.startsWith('00')) return d.slice(2); // already international (0044…)
  const dialDigits = digitsOnly(dial) || DEFAULT_DIAL;
  if (d.startsWith('0')) return dialDigits + d.slice(1);
  if (d.startsWith(dialDigits) && d.length >= dialDigits.length + 8) return d; // already has the code
  // Bare local number without a leading 0 (e.g. 8012345678) → add the code.
  if (d.length <= 10) return dialDigits + d;
  return d;
}

const tail10 = (d: string) => d.slice(-10);

/** Same phone number regardless of formatting / country-code prefix. */
export function samePhone(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = digitsOnly(a);
  const y = digitsOnly(b);
  return x.length >= 7 && y.length >= 7 && tail10(x) === tail10(y);
}

export interface RosterEntry {
  name: string | null;
  phone: string | null; // full international digits
  email: string | null;
}

/**
 * Parse a pasted list, one tester per line: "Grace Obi, 0803 123 4567" or
 * "Samuel, sam@mail.com, 08012345678". Parts split on comma / semicolon / tab / pipe.
 */
export function parseRosterText(text: string): RosterEntry[] {
  const out: RosterEntry[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    let name: string | null = null;
    let phone: string | null = null;
    let email: string | null = null;
    for (const part of line.split(/[,;\t|]/).map((p) => p.trim()).filter(Boolean)) {
      if (part.includes('@')) {
        email ??= part.toLowerCase();
      } else if (digitsOnly(part).length >= 7 && /^[+\d\s().-]+$/.test(part)) {
        phone ??= fullPhone(part) || null;
      } else {
        name ??= part;
      }
    }
    if (phone || email) out.push({ name, phone, email });
  }
  return out;
}

/** Fill {name} with the person's first name (or a friendly fallback). */
export function fillTemplate(template: string, name: string | null | undefined): string {
  const first = (name ?? '').trim().split(/\s+/)[0] || 'friend';
  return template.replace(/\{name\}/gi, first);
}

export const whatsappLink = (phone: string, text: string) =>
  `https://wa.me/${digitsOnly(phone)}?text=${encodeURIComponent(text)}`;

export const mailtoLink = (email: string, subject: string, body: string) =>
  `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

/** "+234 803 123 4567"-style label for display. */
export function prettyPhone(full: string): string {
  const d = digitsOnly(full);
  if (!d) return '';
  if (d.startsWith('234') && d.length === 13) return `+234 ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
  return `+${d}`;
}

// ── Days (YYYY-MM-DD strings; the "day" is an Africa/Lagos calendar day) ──────
export const isDayString = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z'));

export function shiftDay(day: string, delta: number): string {
  const d = new Date(day + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000);
}

export function dayLabel(day: string, today: string): string {
  const pretty = new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC',
  });
  if (day === today) return `Today · ${pretty}`;
  if (day === shiftDay(today, -1)) return `Yesterday · ${pretty}`;
  return pretty;
}

export function lastSeenLabel(lastDay: string | null, today: string): string {
  if (!lastDay) return 'No activity recorded yet';
  const n = daysBetween(lastDay, today);
  if (n <= 0) return 'Last opened today';
  if (n === 1) return 'Last opened yesterday';
  return `Last opened ${n} days ago`;
}

/** Clock time in Nigeria (WAT) for an ISO timestamp. */
export function formatWat(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lagos' });
}
