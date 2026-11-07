import type { Lang } from './languages';
import en from '../../../locales/en.json' with { type: 'json' };
import fr from '../../../locales/fr.json' with { type: 'json' };
import es from '../../../locales/es.json' with { type: 'json' };
import pt from '../../../locales/pt.json' with { type: 'json' };

/**
 * Screen text. All wording lives in the JSON files at the project root (locales/en.json, fr.json, es.json, pt.json); there is no
 * text written into the screens themselves. English is the source: a key that another language lacks shows in English, so the app
 * never shows a blank (tests/i18n.test.mts fails if a language is missing a key). Run `npm run check-i18n` to list any text that is
 * still written directly into a screen.
 * The French, Spanish and Portuguese wording was written without a native speaker's review: have it checked (see docs/LANGUAGES.md).
 */
export type MessageKey = keyof typeof en;
type Table = Record<string, string>;

export const EN = en as Record<MessageKey, string>;
export const MESSAGES: Record<Lang, Table> = { en, fr, es, pt };

/** The text for `key` in `lang`, in English if that language has no wording for it yet. `{name}` slots are filled from `vars`. */
export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const raw = MESSAGES[lang]?.[key] ?? EN[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_m, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}
