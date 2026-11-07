# App languages

English (the default), French, Spanish and Portuguese. Nothing else is offered. The first launch follows the phone's language (anything unsupported opens in English); after that the person's own choice wins and is kept on the phone (`pfm_lang`).

## How people change it
A **Language** button (globe icon) is in the Home header, in the side menu and in Settings. One tap opens a short list (English, Français, Español, Português); picking one switches the whole app at once, with no restart. The Bible follows the language (Louis Segond 1910, Reina-Valera 1909, Almeida), unless the person picked a Bible themselves. The Home "Language" card opens the same list.

## Where the words live
All screen text is in four files at the project root, **no text is typed into the screens themselves**:

- `locales/en.json`, `locales/fr.json`, `locales/es.json`, `locales/pt.json` (same keys in all four, sorted)
- the app name is `app.name`: Prayer Fire / Feu de Prière / Fuego de Oración / Fogo de Oração (the Play Store name stays "Prayer Fire")
- code: `src/lib/i18n/messages.ts` (`translate`, English fallback per key), `src/app/i18n.tsx` (`useI18n()` gives `t(key, {slots})`, `tr(englishText)` and `lang`)
- `t('some.key')` is used for screen text. Text that comes from data lists (Start-Up Prayer steps, categories, plan names, error messages from the server) keeps its English in the data and is shown with `tr('English text')`, which looks the English up in `en.json`; unknown text is shown unchanged.

## Adding or changing wording
1. Add the key to all four files (same slots like `{name}`), keep the keys sorted.
2. Use `t('key')` in the screen.
3. Run `npm run check-i18n` (lists any text still typed into a screen) and `npm test` (`tests/i18n.test.mts` fails if a language lacks a key, a slot differs, a language was left in English, or a screen uses an unknown key).

## What is translated
Home, the side menu, the feature row, the header and bottom bar, Bible screens, Prayer Workshop, Start-Up Prayer, schedule and alarm screens (including the Android alarm screen and notification, which get their wording from the app when the language changes), prayer groups, global alerts, journal, My Study, plans and subscription, sign-in, donations, feedback, onboarding, update banners, error messages.

## What is NOT translated yet (honest list)
- Admin screens (staff only), the long legal pages (Terms, Privacy Policy, Community Guidelines, Delete account), the User Manual page.
- Data content: the 500 Prayer Verses topics (KJV), the Wisdom of the Day teachings, the "What's New" release notes, the Scripture Vault's own verse list. The Bible itself IS available in French, Spanish and Portuguese; the verse shown in an alarm notification is still the English (KJV) one.
- Page titles in the browser tab, and a few server error messages that are not in the list.

## Review needed
The French, Spanish and Portuguese wording was written by an AI assistant, not a native speaker. Before promoting a language in the Play Store listing, ask a native speaker to read the file for their language (about 950 lines) and correct anything that sounds wrong, especially prayer terms and the bottom-bar labels (they must stay short: 12 characters at most).

## Play Store
Adding languages in the app does not change the store listing. To list the app in other languages, add translated listings in Play Console, Grow, Store presence, Custom store listings / Translations.
