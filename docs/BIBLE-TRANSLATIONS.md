# Bible translations in Prayer Fire: sources and licences

Licences were checked on 2026-11-05 against the publisher notes of the data sets named below. The app only bundles texts that are public domain or freely licensed.

| In the app | Language | Text | Licence | Source file |
|---|---|---|---|---|
| KJV | English | King James Version | Public domain | midvash/bible-data (already bundled) |
| ASV | English | American Standard Version 1901 | Public domain | midvash/bible-data (already bundled) |
| WEB | English | World English Bible | Public domain | midvash/bible-data (already bundled) |
| LSG | French | Louis Segond 1910 | Public domain (1910 text) | midvash/bible-data `versions/fr/lsg/lsg.json` |
| RV1909 | Spanish | Reina-Valera 1909 | Public domain | scrollmapper/bible_databases `formats/json/SpaRV.json` (source note: "License: Public Domain") |
| Almeida | Portuguese | Bíblia Livre (Almeida 1819, revised 2018) | **CC BY 4.0 Brazil: credit required** | midvash/bible-data `versions/pt/almeida-livre/almeida-livre.json` |

## Things to know
- **Portuguese is not strictly "public domain".** A genuinely public-domain Almeida text could not be found in a source whose licence we could check. Bíblia Livre is a 2018 revision of the 1819 Almeida translation that is free to copy and redistribute **as long as it is credited**. The credit is shown on the Bible screen whenever it is selected (`credit` in `src/lib/bible/translations.ts`). If you prefer a different Almeida, replace the file and re-run the steps below.
- **Louis Segond 1910:** public domain by age; the source data set records no original file for it, so provenance is "by age" only.
- **Reina-Valera 1909:** 18 verses are folded into the verse before them in this versification (for example Numbers 12:16, Job 38:39-41), so those verse numbers do not appear. This is how the 1909 text is numbered, not a missing text.
- **Not included on purpose:** RVR1960, NVI, NAA, ARA, Segond 21 and other modern translations are copyrighted.
- **Swahili, Korean and Tagalog:** no Bible is bundled (the brief only asked for French, Spanish and Portuguese). With one of these languages chosen, the Bible stays in English and the Bible screen says so.

## Adding or replacing a translation
1. Download the source JSON (see the table) into an empty folder; name them `lsg.json`, `alm.json`, `rv1909.json`.
2. `node scripts/import-translations.mjs <that folder>` writes `src/data/bible/<id>.json` (checks 66 books, chapter counts and verse numbers against the KJV).
3. `npm run split-bible` writes the one-file-per-book copies in `public/bible-data/v1/`. (If you change an existing text, rename `v1` and `BOOK_BASE` so phones fetch the new files.)
4. Add the translation to `BIBLE_TRANSLATIONS` and `importTranslation` (`src/lib/bible/`), with a `credit` if the licence asks for one.
5. `npm test` (the i18n test checks every bundled Bible).
