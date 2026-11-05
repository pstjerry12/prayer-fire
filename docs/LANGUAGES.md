# App languages

English, French, Spanish, Portuguese, Swahili, Korean and Tagalog. The first visit follows the phone's language (Settings, Language changes it). The choice is kept on the phone (`pfm_lang`).

## What is translated
- Bottom menu, the Home screen (headline, prayer cards, schedule bar, tiles, groups and network cards), the Bible page title, the Bible translation names and book names (French, Spanish, Portuguese), the Settings title and the language picker itself.
- All text is in `src/lib/i18n/messages.ts`. English is the source; a missing wording shows in English, so nothing is ever blank. `tests/i18n.test.mts` checks that every language has every key.
- With French, Spanish or Portuguese chosen, the Bible opens in Louis Segond 1910, Reina-Valera 1909 or Bíblia Livre, book names are localised, "Read aloud" speaks in that language (uses the phone's voices; install the language's voice if the phone has none), and Bible search accepts local book names ("Jean 3", "1 Reyes 2", "João 3:16").
- Swahili, Korean and Tagalog: the screens above are translated, but the Bible stays in English (a note says so).

## What is NOT translated yet
Prayer Workshop, Start-Up Prayer steps, schedule page, groups, alerts, partner/plans, auth and sign-in, Settings body text, admin, legal pages, notifications, alarm screen. **Prayer Verses** (the 500 topic verses) and **My Study** stay in KJV English. Each of these can be added key by key in `messages.ts` without touching the others.

## Review needed
The non-English wording was written by an AI assistant, not a native speaker. Before promoting a language in the Play Store listing, ask a native speaker to read `messages.ts` for their language (about 36 short lines each) and correct anything that sounds wrong (for example the Korean and Swahili prayer terms, and the Tagalog tab labels).

## Play Store
Adding languages in the app does not change the store listing. To list the app in other languages, add translated listings in Play Console, Grow, Store presence, Custom store listings / Translations.
