# Prayer Fire — Project Handoff

> **Read this first.** This file is the single source of truth for resuming work on Prayer Fire in a fresh session.
> Last updated: **2026-10-31** (Google Play Billing: Partner + Leader via RevenueCat, admin Pricing, Free Premium Mode, see §5 "Premium tiers" and §8; home screen redesign, see §5 "Home screen"). Before that **2026-10-24**, after the "Audio Bible" visibility changes (Bible tab, Verse of the Day card, Listen button, store copy, first-launch welcome slides, verse Share; Android build 25 prepared).
> No secrets appear in this file. Credentials are listed by **name only**, with where they live.

---

## 1. Project overview

**Prayer Fire** (tagline: *"Pray 3x — A Cure for Prayerlessness"*, *"Write it. Speak it. Pray it. Trust God."*, *"Praying like Daniel"*) is a Christian prayer app. It helps believers build a habit of praying **three times a day** (Daniel 6:10). The core is:

- prayer alarms that ring like a real alarm clock at the user's chosen prayer times;
- tools to write prayer points;
- an offline Bible;
- a guided 7-step prayer session;
- a fasting tracker;
- community features: prayer groups, a partner prayer wall, testimonies and announcements.

| Item | Value |
|---|---|
| Owner / founder | Credited in-app as **"Pastor Jerry C."**. GitHub `pstjerry12`, Play Console developer account "Prayer Fire Movement" (personal account). Based in **Nigeria**. |
| Audience | Christians of all ages, starting in Nigeria and Africa, then worldwide. This includes church members, intercessors, prayer groups and pastors. Many users are older, which is why the Text Size setting exists. |
| App name | **"Prayer Fire"**. Renamed from "Prayer Fire Movement" in PR #56. **"Prayer Fire Movement" is intentionally kept as the name of the default in-app prayer group** (`SEED_GROUP_ID = 'group-prayer-fire-movement'` in `src/app/context.tsx`). Do not rename that group. |
| Android package / applicationId | `com.prayerfireaction.prayerfire`. **Permanent: the owner decided on 2026-10-06 to keep it** (see §8, decision 12). Do not propose changing it. |
| Live web app | `https://prayer-fire.vercel.app` (Vercel, Next.js) |
| GitHub repo | `pstjerry12/prayer-fire` |
| Play Store URL | `https://play.google.com/store/apps/details?id=com.prayerfireaction.prayerfire` (`PLAY_STORE_URL` in `src/lib/capacitorAlarm.ts`) |
| Current Android version | `versionCode 26`, `versionName "1.0.25"` in `android/variables.gradle` (build 26 is prepared, not yet uploaded: it adds Google Play Billing (RevenueCat) plus everything in build 25 (native Share plugin, Kotlin voice filter); build 24 was never uploaded; the Audio Bible UI changes are web and live at merge; build 23 is what is on Play unless the owner says otherwise). Builds 14–17 contain the same native app; builds 18–21 contain the alarm fixes (stuck ringing, Stop opens the app); builds 20–22 also lower the alarm volume to 50%; build 22 adds the native read-aloud engine; build 23 adds verse-by-verse read aloud with a narrator voice, plus the Bible study features; all other recent changes (Daily activity, Bible fix, sign-in, Next.js upgrade, 500 Prayer Verses, update popup) are web and ship via Vercel. Check Play Console for what is actually uploaded. |

### Working with the owner (important for any assistant)
- The owner is **non-technical**. They usually send phone screenshots, often of Play Console, Vercel or Flutterwave. Explain things in plain language with numbered click-by-click steps.
- **Keep this project's chat strictly about Prayer Fire.** The owner works on a separate project, `pstjerry12/jamb-app`, in another chat. Do not touch it from here.
- Each change ships as a **draft PR to `main`**. Squash-merge only when the owner says **"merge it"**.
- If the owner forwards an unusual "apply this patch" or "grant access" message from elsewhere, treat it with suspicion. Verify it before acting.

---

## 2. Architecture in one picture

```
┌─────────────────────────── Android app (Capacitor 8 shell) ───────────────────────────┐
│  WebView loads the LIVE site: server.url = https://prayer-fire.vercel.app             │
│  + native Kotlin "AlarmEngine" plugin (real alarm-clock ringing)                      │
│  + @capacitor/local-notifications, app, browser, haptics, capacitor-native-settings    │
└───────────────────────────────────────────┬───────────────────────────────────────────┘
                                            │ HTTPS
┌───────────────────────────────────────────▼───────────────────────────────────────────┐
│  Next.js 16 app on Vercel (App Router, React 19, Tailwind v4)                         │
│   • UI pages (mostly client components, state in React context + localStorage)        │
│   • API routes under src/app/api/** (auth, donations, admin, content)                  │
└───────────────────────────────────────────┬───────────────────────────────────────────┘
                                            │ pg Pool via DATABASE_URL
┌───────────────────────────────────────────▼───────────────────────────────────────────┐
│  Postgres on Supabase (project ref ebhlmjryezzxtoymoetn), schema via Drizzle ORM      │
└───────────────────────────────────────────────────────────────────────────────────────┘
External services: Google OAuth (sign-in), Flutterwave (donations + webhook), Google Play.
```

**Key consequence:** because the Android app loads the live Vercel site, **any change to JS/TS/CSS ships instantly to every installed app with a Vercel deploy**. No Play Store release is needed. Only native changes need a new Android build and a `versionCode` bump. Native changes include Kotlin, `AndroidManifest.xml`, Capacitor plugins, icons and `capacitor.config.ts`.

---

## 3. Tech stack (exact versions from `package.json` and Gradle)

**Web**
| Package | Version |
|---|---|
| next | 16.2.11 (App Router) |
| react / react-dom | 19.2.6 |
| typescript | 5.9.3 |
| tailwindcss / @tailwindcss/postcss | 4.1.17 (v4, `@theme` tokens in `src/app/globals.css`) |
| drizzle-orm / drizzle-kit | 0.45.2 / 0.31.10 |
| pg / @types/pg | 8.20.0 / 8.18.0 |
| jose (JWT) | ^6.2.8 |
| bcryptjs | ^3.0.3 |
| lucide-react (icons) | ^1.31.0 |
| dotenv | 17.3.1 |
| eslint / eslint-config-next | 9.39.4 / 16.2.11 |
| @types/node | 22.19.15 |
| Node.js | 22 (CI uses `node-version: 22`) |

Fonts (`next/font/google`): **Fraunces** for headings (`font-serif-heading`, `--font-fraunces`) and **Nunito Sans** for the body (`--font-nunito`).

**Mobile / native**
| Item | Version |
|---|---|
| @capacitor/core, cli, android | ^8.5.0 |
| @capacitor/app | ^8.1.1 |
| @capacitor/browser | ^8.0.4 (Chrome Custom Tabs for Google sign-in) |
| @capacitor/haptics | ^8.0.2 |
| @capacitor/local-notifications | ^8.3.1 |
| capacitor-native-settings | ^8.2.0 |
| Android Gradle Plugin | 8.13.0, Gradle wrapper 8.14.3 |
| Kotlin | 2.0.21 (AlarmEngine plugin) |
| Java (CI) | Temurin 21 |
| minSdk / compileSdk / targetSdk | 24 / 36 / 36 |
| google-services classpath | 4.4.4 |

**Hosting and services:** Vercel (project `prayer-fire`, project ID `prj_RgTQrgyaPFCdwL3JW5srLhylvQ7E`, team `pstjerry12`), Supabase Postgres, Google Cloud OAuth client, Flutterwave (live mode), Google Play Console, and GitHub Actions for Android builds.

---

## 4. Folder structure

```
prayer-fire/
├── PROJECT_HANDOFF.md            ← this file
├── package.json                  scripts: dev, build, start, lint (eslint .), typecheck (tsc --noEmit)
├── next.config.ts                exposes NEXT_PUBLIC_BUILD_SHA (= VERCEL_GIT_COMMIT_SHA) to the client
├── capacitor.config.ts           appId, appName "Prayer Fire", server.url → live Vercel site, LocalNotifications config
├── drizzle.config.ts             drizzle-kit config (reads DATABASE_URL via dotenv)
├── vercel.json                   framework nextjs, npm run build / npm install
├── eslint.config.mjs, postcss.config.mjs, tsconfig.json, next-env.d.ts
├── .github/workflows/
│   └── android-release.yml       builds the signed AAB + APK (manual dispatch or v* tag)
├── android/                      Capacitor Android project
│   ├── variables.gradle          SDK levels + appVersionCode / appVersionName (BUMP for native releases)
│   ├── build.gradle, app/build.gradle (applicationId, signing from keystore.properties, Kotlin)
│   └── app/src/main/
│       ├── AndroidManifest.xml   permissions, deep-link scheme, AlarmEngine receivers/service/activity, <queries>
│       ├── java/com/prayerfire/app/MainActivity.java   registers AlarmEnginePlugin
│       ├── kotlin/com/prayerfire/app/alarmengine/
│       │   ├── AlarmEnginePlugin.kt   JS bridge: schedule/cancel/dismiss + permission checks
│       │   ├── AlarmScheduler.kt      AlarmManager.setExactAndAllowWhileIdle per prayer time
│       │   ├── AlarmReceiver.kt       fires at alarm time → starts AlarmRingService
│       │   ├── AlarmRingService.kt    foreground mediaPlayback service; rings 5 min; "Stop" action (ACTION_STOP)
│       │   ├── AlarmRingActivity.kt   full-screen ring UI over lock screen
│       │   ├── AlarmStore.kt          persists scheduled alarms (SharedPreferences)
│       │   └── BootReceiver.kt        re-schedules after reboot
│       └── res/raw/              alarm tones: beep, bells, chime, classic, digital, praise (.wav)
├── docs/
│   ├── PLAYSTORE-RELEASE.md      full Play Store launch guide (store listing copy, data safety, testing gate, updates)
│   └── payments/PAYSTACK-*.txt   old Paystack KYC/SCUML email drafts (private; moved out of public/ in PR #62)
├── public/
│   ├── sw.js                     service worker (offline cache; /api/app-version bypassed)
│   ├── manifest.webmanifest, manifest.json, logo.png, icons, sounds
│   └── SALES-PITCH.md, sales-pitch.txt   marketing copy (intentionally public)
├── scripts/
│   ├── build-mobile.sh, verify-android.sh, prepare-android-webdir.sh
│   ├── generate-keystore.sh, generate-android-assets.sh, generate-store-assets.sh
│   ├── generate-alarm-sounds.js   regenerates the alarm tone WAVs (node scripts/generate-alarm-sounds.js)
│   └── web/fallback.html          offline fallback page copied into Capacitor webDir (out/)
├── store-assets/                 Play listing graphics (icon 512, feature graphic, screenshot template)
├── supabase/
│   ├── rls.sql                   Row Level Security policies — re-run after every drizzle-kit push
│   └── seed-testimonials.sql
└── src/
    ├── db/
    │   ├── index.ts              pg Pool + drizzle() (throws if DATABASE_URL missing)
    │   └── schema.ts             all tables (see §6)
    ├── data/bible/               kjv.json, asv.json, web.json (~14 MB total, bundled for offline reading)
    ├── lib/
    │   ├── auth.ts               bcrypt hashing, JWT sign/verify (jose HS256, 30 days), cookie "pfm_token", getUserIdFromRequest
    │   ├── authClient.ts         client session storage / fetchMe / logout / deleteAccount
    │   ├── adminAuth.ts          getSessionUser, getAdminUser (ADMIN_EMAIL self-heal)
    │   ├── adminBootstrap.ts     promoteAdminIfMatches(ADMIN_EMAIL)
    │   ├── capacitorAlarm.ts     ALL native bridging: platform detection, alarm scheduling, permissions,
    │   │                         notification taps, auth deep link, back button, in-app browser, app version
    │   ├── alarmSound.ts         web-audio alarm tone playback (in-app overlay)
    │   ├── audioStore.ts         IndexedDB "pfm-audio" for uploaded worship songs
    │   ├── backHandlerStack.ts   Android back-button handler stack
    │   ├── bible/translations.ts, bible/loadTranslation.ts
    │   ├── flutterwave.ts        loads the Flutterwave inline checkout script and opens the payment modal
    │   ├── intercessoryPrayersClient.ts  client for /api/intercessory-prayers
    │   ├── textScale.ts          Text Size setting (root font scaling)
    │   ├── countryCodes.ts, clientUtils.ts, user.ts (toAuthUser)
    └── app/
        ├── layout.tsx            root layout; inline pre-paint scripts: theme, splash, text scale
        ├── AppShell.tsx          AppProvider + global overlays (modals, BottomNav, UpdateBanner, PrayerAlarm…)
        ├── context.tsx           AppProvider: almost all client state + localStorage persistence (see §7)
        ├── globals.css           Tailwind v4 theme tokens (light/dark via .dark class)
        ├── page.tsx              Home
        ├── admin/                /admin back office (8 tabs)
        ├── bible/ fasting/ groups/ manual/ network/ partner/ privacy/
        ├── schedule/ scripture/ startup/ terms/ workshop/ worship/   (one page.tsx each)
        ├── components/           ~39 components (see §5)
        ├── data/                 bibleBooks, bibleVerses, legal, pricingPlans, whatsNew, wisdomData
        ├── utils/                cn.ts (class join), youtube.ts (video id extraction)
        └── api/                  route handlers (see §6)
```

---

## 5. Features and current status

Status key: ✅ live and working · 🟡 works with caveats · ⏳ not built / future.

### Home screen (`/`) ✅ first screen (redesigned 2026-10-31, reordered the same day)
- **Top of the home screen, visible without scrolling on a normal phone** (checked at 360x640 and 390x844), in this order: (1) the **Prayer Fire heading** (the "Pray 3x a Day" chip, "Prayer Fire", "Write it. Speak it. Pray it. Trust God.", "Praying like Daniel"), (2) the **Audio Bible** card, (3) the **Verse of the Day** card. Cards are in `src/app/components/HomeFold.tsx`.
  - **Audio Bible** (`HomeAudioBibleCard.tsx`): a big button that starts reading aloud straight away: "Continue where you stopped" with the book and chapter (it resumes at the saved verse), or "Listen to the Bible, Start with John 1" the first time; Pause/Resume and Stop appear while reading; a "Bible" button opens the full reader on the same chapter. When a chapter finishes, the next chapter is saved so Continue offers it (no automatic chain from chapter to chapter).
  - **Verse of the Day** (`VerseOfTheDayCard` with the `compact` prop): the verse (up to 3 lines) and reference, a round 44px play button that reads it aloud; tapping the text opens the verse page. The Bible page still uses the original card.
- **The Start-Up Prayer card (today's opening prayer) was removed at the owner's request** (it existed for one day, in the first version of this redesign; its file `HomeStartUpCard.tsx` and the draft prayers `openingPrayers.ts` were deleted). The **Start-Up Prayer** entry to the 7-step prayer (`/startup`) stays on the page as a half-width tile: the row under the first screen is split into two halves, **Write Prayer Point** (green) and **Start-Up Prayer** (white), as it was before the redesign. The two tiles are deliberately compact on phones (about 87px tall; the larger sizes still apply from the `md` breakpoint up) so the whole first screen, heading + Bible + verse + both tiles, fits above the bottom menu at 360x640 (the tiles end at about 551px, the menu starts at 558px). (For a short time it was a separate horizontal card below Daily Schedule; the owner then asked for it to share the row again, so that card is gone.)
- **Offline:** the Bible text is bundled and the voice is the phone's own text-to-speech through `readAloud.ts` (native Android engine first). Tested with the network switched off in a browser using a stand-in voice (not on a real phone).
- **Where the listening place is kept:** localStorage `pfm_bible_last` (`{book, chapter, verse?}`) via `src/lib/bibleLastPlace.ts`, written by the home card while it reads (per verse) AND by `BibleReader` (when a chapter is open and per verse while it reads aloud), so it survives closing the app. The reader's own `pfm_bible_position` (sessionStorage) is unchanged.
- **Below those:** announcement banner, the Write Prayer Point / Start-Up Prayer row (two halves), Daily Exaltation, Daily Schedule, Prayer Groups, Prayer Network, User Manual, Partner banner, donation card, testimonies. (The old full-size Verse of the Day card and the "Holy Bible · Read & Listen" link card were removed in the first version because the new cards replace them.)
- **No floating player on home:** each card shows its own play/stop state, so the global `ReadAloudBar` is not used on the home screen.
- Known, existing and not part of this change: the home Prayer Groups card shows a team count read from phone storage during the first render, which causes a React hydration warning in development (it goes away when groups move online, PR #88).

### Prayer alarms (the core feature) ✅
- **Default prayer times** (`context.tsx`): Midnight Hour `00:00`, Noon Prayer `12:00`, Morning Watch `04:00`. Each has `enabled: true, useNativeAlarm: true`. Users can edit times to the minute (`CustomizablePrayerSchedule.tsx`, `/schedule`). Stored in `upp_prayer_appointments`.
- **Android ("Ring like an alarm", default ON):** handled by the native **AlarmEngine** Kotlin plugin.
  - It uses `setExactAndAllowWhileIdle`, so it fires even in Doze.
  - A foreground `mediaPlayback` service plays the chosen tone on the ALARM stream at full volume for **5 minutes** (`RING_DURATION_MS`).
  - A full-screen activity appears over the lock screen.
  - The notification has a **"Stop"** action (`ACTION_STOP`, PR #58).
  - Alarms are re-scheduled after reboot.
- **Fallback / other platforms:** `@capacitor/local-notifications` (plain notifications) and, on web, browser notifications via `sw.js` plus an in-app overlay (`PrayerAlarm.tsx`, `alarmSound.ts`) with a DISMISS button.
- **Important fix (PR #59):** both mechanisms used to fire for the same appointment. Stopping the native alarm left a plain notification, and tapping it re-rang the in-app alarm ("the alarm comes back"). Now `scheduleNativeAlarms()` **skips** local notifications for any appointment where `useNativeAlarm && platform === 'android'`. Keep this invariant.
- **Permissions:** `AlarmPermissionFlow.tsx` walks the user through each permission in turn: notifications, exact alarms, full-screen intent and battery-optimization exemption. Settings pages open via `capacitor-native-settings`.
- **Ringtone choices:** beep, bells, chime, classic, digital, praise.

### Prayer Workshop (`/workshop`) ✅
- Users write prayer points: Family, Special and Intercessory.
- Voice-to-text uses the browser Web Speech API.
- Personal/special prayers are stored locally (`upp_prayer_points`).
- **Intercessory prayers sync to the server** (`/api/intercessory-prayers`, table `intercessory_prayers`, private per user) when signed in. A local copy lives in `upp_intercessory_prayers`.

### Start-Up Prayer (`/startup`) ✅
- A guided 7-step session with a timer per step:
  1. Mercy Prayer
  2. Thanksgiving
  3. Invite Holy Spirit
  4. Praise & Worship
  5. My Prayer List
  6. Special Prayer (Daniel 6:10)
  7. Intercessory Prayer
- Swiping advances the step.
- A synthesized bell-peal celebration sound plays on completion.
- Prayer time is tracked in `pfm_prayer_total_seconds`.

### Bible (`/bible`) ✅
- KJV, ASV and WEB are bundled as JSON. Offline use works through the service worker: a translation is cached the first time it is opened with internet, then reads offline (it is NOT inside the APK because `server.url` loads the live site). Store/UI copy says "works offline after first load" accordingly.
- **Audio Bible visibility (2026-10-24):** the bottom tab is labelled "Bible" (book icon). Home has a Verse of the Day card near the top (`VerseOfTheDayCard`, buttons Read = opens that chapter with the verse selected via sessionStorage `pfm_bible_position.verse`, Listen = read aloud). The reader has a big floating green **Listen** button (also on the Book/Chapter lists, where it opens the chapter and reads it from verse 1) with a one-time tip (localStorage `pfm_listen_tip_seen`). Read aloud still uses the device's text-to-speech, so it is offline only if the phone's voice is an installed one; the Android engine prefers installed voices.
- 3-step flow: Book → Chapters → Verses (`BibleReader.tsx`). The Android back button steps back through it.
- Favorites (`upp_bible_favorites`) and translation choice (`upp_bible_translation`) are saved.
- `BibleLibrary.tsx` holds the "Prayer Verses" collection: 10 themes (Faith, Protection, Healing, Strength, Peace, Provision, Wisdom, Prayer, Family, Thanksgiving) with **50 KJV verses each (500 total)**. The first few per theme are hand-written in `src/app/data/bibleVerses.ts`; the rest are in `src/app/data/bibleVersesExtra.ts`, which is **generated** by `node scripts/generate-prayer-verses.mjs`. Only the references are chosen in that script; the wording is copied from the bundled `src/data/bible/kjv.json`. To add or swap verses, edit the reference lists in the script and re-run it (never hand-edit the generated file).

### Scripture Vault (`/scripture`) ✅
Curated verses in English, Spanish, French, Portuguese and Swahili.

### Daily devotionals ✅
- Shown once per day: **Verse of the Day** (`DailyVerseModal`), then **Wisdom of the Day** (`DailyWisdomModal`, from the founder's book chapters in `wisdomData.ts`).
- The `upp_daily_devotion_shown` key records that they were shown today.

### Fasting tracker (`/fasting`) ✅
3/7/21/40-day plans, stored in `upp_fasting_plan`.

### Streaks ✅
Daily check-in streak (`upp_streak_count`, `upp_last_prayer_date`, `upp_prayed_dates`).

### Worship (`/worship`) ✅
The user uploads songs, stored in IndexedDB `pfm-audio`; metadata goes in `upp_worship_songs`.

### Prayer Groups (`/groups`) ✅ shared and online (Leader features phase 1, 2026-10-30)
- **Groups now live on the server**, shared between everyone (before this they were only in each phone's localStorage `pfm_groups` / `pfm_group_messages`; that old data is left on the phone, never deleted, and a Leader sees a "Move online" button for groups they created on that phone: it creates a shared group with the same name/description/prayer time/join setting; chat history is not moved and members rejoin with the new invite code). The old built-in "Prayer Fire Movement" seed group no longer exists (the directory starts empty until a Leader creates groups).
- **Who can do what:** joining/reading/posting needs Partner (or Leader, or Free Premium Mode); **creating** a group needs Leader (or Free Premium Mode); a Leader may lead up to 10 groups. A group is **Open** (join instantly) or **Approval only** (the leader/co-leader approves). The leader sets the pinned verse, prayer time and join mode and approves or declines requests; a member can leave; only the leader can delete the group. Members post **prayer requests, testimonies, messages and prayer alerts**, tap **I'm praying** on a post, comment, and check in "I prayed today" (which also feeds the global fire streak).
- **Enforcement is in the database, not just the app** (`supabase/groups.sql`, idempotent). Every call to `/api/groups` runs in one transaction that first does `set_config('app.user_id', <id>)` and `set local role app_user` (`src/lib/groupsDb.ts` `runAsUser`). `app_user` is a restricted role (no BYPASSRLS, not the table owner) that can only SELECT the group tables through Row Level Security policies; every write goes through a `SECURITY DEFINER` function (`app_create_group`, `app_join_group`, `app_join_group_by_code`, `app_leave_group`, `app_decide_member`, `app_update_group`, `app_delete_group`, `app_add_post`, `app_add_comment`, `app_toggle_praying`, `app_toggle_checkin`; directory = `app_group_directory()`). The functions read subscription state from the `subscriptions` table (written by RevenueCat's webhook) and Free Premium Mode from `app_settings` (`app_is_premium()`, `app_is_leader()`), so access follows RevenueCat entitlements in real time (a refund or expiry stops it at once). Supabase's public `anon`/`authenticated` roles have no access to the group tables or functions. No new secret or connection string is needed (the existing `postgres` connection can `SET ROLE app_user`).
- **Privacy:** members see other members' **display names only** (no ids, emails or phones); only leaders/co-leaders get member ids (to approve) and the invite code (invite codes are in their own table, `group_invites`).
- **Tables:** `groups`, `group_invites`, `group_members` (role leader|co_leader|member, status active|pending|removed|blocked), `group_posts` (kind message|alert|request|testimony, `pinned`, `status` visible|hidden), `group_comments`, `group_praying`, `group_checkins`. Declared in `src/db/schema.ts` so `drizzle-kit push` does not drop them; **after any push re-run `supabase/groups.sql`** (push can disable RLS/drop policies). Deleting an account deletes the groups that person created and their posts/comments/marks/memberships elsewhere.
- **Code map:** `src/lib/groupsDb.ts` (transaction + error messages), `src/lib/groups.ts` (queries), `src/lib/groupsClient.ts` (browser fetch + legacy phone groups), `src/app/api/groups/route.ts` (GET directory / `?id=` detail / `?id=&post=` comments; POST actions), `src/app/components/PrayerGroups.tsx`. The group state was removed from `context.tsx`.
- **Tests:** `tests/groups.test.mts` runs the real rules against a real Postgres (set `GROUPS_TEST_DATABASE_URL`, e.g. a local database containing `supabase/groups.sql` plus stand-in `users`, `app_settings`, `subscriptions` tables; skipped otherwise, so `npm test` still passes anywhere): Leader/Partner/free, expired and refunded Leader plans, Free Premium Mode and its end date, blocked members, outsiders, the public anon role. Also run end-to-end in a browser against a local database (real API + real RLS).
- **Moderation (phase 2, built):** members can **report** a post or comment (reasons: spam, rude, not appropriate, other; one report per person per item; not their own); leaders and co-leaders see a **Reports queue** (grouped per item, with the reasons and count, never the reporter) and can Hide, Delete or Dismiss. Leaders/co-leaders can **hide/unhide** or **delete** any post or comment (hidden items vanish for members; the author and leaders still see them, and the author is told a leader hid it; hiding also unpins), **pin** up to 3 posts to the top, **remove** a member (may ask to join again) or **block** them (cannot rejoin until unblocked), optionally hiding all their posts and comments. Only the group's **leader** appoints/removes **co-leaders** (max 3); a co-leader may moderate ordinary members but not the leader or other co-leaders. Authors can delete their own posts and comments. Table `group_reports` (+ policy: leaders read their group's reports, a member reads only their own); functions `app_report`, `app_resolve_report`, `app_set_post_hidden`, `app_set_comment_hidden`, `app_delete_post`, `app_delete_comment`, `app_pin_post`, `app_remove_member`, `app_unblock_member`, `app_set_role`. UI: `GroupModeration.tsx` (`ReportsQueue`, `MembersManager`) + post/comment actions in `PrayerGroups.tsx`. **Moderation power needs the acting person's own active Leader plan (or Free Premium Mode)**, co-leaders included; a lapsed leader keeps their group but cannot moderate until they renew. Join-request approval and open/approval-only mode (phase 1) use the same rule. Tested by database checks plus 20 browser checks on the real stack.
- **Analytics (phase 3, built):** a **Group analytics** card for the group's own **leader only** (not co-leaders, not members; also needs the leader's active Leader plan or Free Premium Mode; free mode does NOT give members analytics). One database function `app_group_analytics(group)` returns NUMBERS ONLY (no names or ids): members (total, new in 7/30 days; the leader is not counted as new), prayer requests, testimonies and "I'm praying" taps (all-time, last 7, last 30), a 30-day per-day series (the app charts the last 7 or all 30; Africa/Lagos days), activity by weekday and the 3 busiest dates. "Activity" = posts + comments + "I'm praying" taps + check-ins; hidden posts (and what happened on them) are not counted. Never reads anything a leader could not already see. API: `GET /api/groups?id=<group>&analytics=1` (403 for anyone else). UI: `src/app/components/GroupAnalytics.tsx` (tiles, 7/30-day toggle, metric chips, plain bar charts with a text description for screen readers). Tests: 133 database checks in total (the analytics ones check exact counts, the 7/30-day edges, hidden posts excluded, no names in the output, and who is refused) plus 12 browser checks on the real stack.
- **Phases still to come (not built yet):** featured groups. The Leader paywall mentions each feature only once it works (it lists moderation tools and group analytics now). Known limits: web-only trial users (a client-side trial with no real subscription) cannot use server groups until the web charges; no rate limits on posting or reporting yet; no notification to members when a leader removes a post (they see the banner on their own post).

### Partner Network / prayer wall (`/network`) 🟡
Premium-gated UI. Requests POST to `/api/partner-requests` (table `partner_requests`, `approved` flag for moderation).

### Testimonies ✅
Submit via `/api/testimonials`; an admin approves them before they appear publicly.

### Announcements and events ✅
- Admin-authored.
- `AnnouncementBanner` on Home.
- Events have date, time and link.

### Daily Morning Exaltation ✅
- A YouTube card on Home (`DailyExaltation.tsx`).
- The admin sets the URL, title and subtitle in Admin → Settings (`daily_youtube_*` keys).

### Social links / "Follow Us" ✅
YouTube, Facebook, Instagram, WhatsApp and TikTok, editable by the admin (`social_*` keys, `/api/social-links`).

### Accounts and sign-in ✅
- **Email/phone + password** (`/api/auth/register`, `/login`): bcrypt hash, JWT in httpOnly cookie `pfm_token` (30 days). A `Bearer` header fallback exists for the Capacitor WebView.
- **Google sign-in** (`/api/auth/google/start` → Google → `/api/auth/google/callback`):
  - On Android, the flow opens in a **Chrome Custom Tab** (`@capacitor/browser`, `?native=1`).
  - The callback then redirects to the deep link `com.prayerfireaction.prayerfire://auth-callback?token=…`.
  - The app catches the link (`listenAuthDeepLink`), closes the Custom Tab (`closeInAppBrowser()`), closes the auth modal and exchanges the token (PR #54).
  - The manifest `<queries>` entries are required for Custom Tabs on Android 11+.
- **Sign-in is required (PR #67, reworked in the next PR).** `SignInGate.tsx` is a full-screen wall (z-75) shown whenever `authChecked && !user`, except on `/privacy` and `/terms` (Play needs a public privacy page). **The sign-in form is the wall:** it renders `AuthModal` with `gated` (no close button, no "Continue as guest"). A phone that has signed in before opens on **Sign In** with the email/phone already filled in and the password box focused (`pfm_last_login`, set in `context.tsx` whenever a user is signed in); a new person opens on **Create Account**. **"Continue with Google" appears only on Create Account**, plus two exceptions so nobody is locked out: (1) a phone whose last sign-in was Google shows "You signed in with Google as <email>" with one Continue-with-Google button (and "Use a different account"); (2) `/api/auth/login` answers `{googleOnly:true}` when a password is tried on a Google-created account, and the form then shows the Google button. Why: Google-created accounts get a random unknown password (`google-<uuid>`, `provider: "google"`), so they can never sign in with a password. The Google flow is find-or-create by email, so Create Account → Continue with Google also signs an existing Google user in. Shared Google flow: `src/lib/googleSignIn.ts`. The old one-time prompt (`pfm_auth_prompted`) was removed.
- **Auto sign-out when idle** (`SessionGuard.tsx`): signs the person out after N minutes of inactivity (app closed/backgrounded or open-but-untouched). N comes from the admin setting `idle_lock_minutes` (Admin → Settings → "Sign-in & Auto Sign-out"; blank = 30, `0` = never), served by `/api/app-version` as `idleLockMinutes` and cached in `pfm_idle_minutes`. Activity is stamped in `pfm_last_active`; `pfm_idle_notice` shows the "signed out for inactivity" note. A fresh sign-in has no stamp, so it never locks instantly. It is a client-side rule; the JWT itself still lasts 30 days.
- **Session check** (`checkSession()` in `authClient.ts`): sends the stored token as a `Bearer` header as well as the cookie. Before this fix, Google-signed-in Android users (token only in localStorage) were never recognised by `/api/auth/me` on later opens, so their opens were **not counted** in Daily activity. `/me` answers `{user:null}` (200) only for an invalid/expired session and **503** on a server error; the app signs out only on the former, so a database hiccup or being offline never logs anyone out. A `authEpochRef` in `context.tsx` stops a late "ok" answer re-signing someone in after a sign-out.
- Native prayer alarms are scheduled by the Android AlarmEngine and keep ringing even while the wall is up.
- Account deletion and data export live in Settings (`/api/auth/account`).

### Account Settings modal (`AccountSettings.tsx`) ✅
Opened from the Navbar profile menu, `HeroProfile`, or the **"Aa" button** in the bottom bar. Sections:
- Account
- Stats
- **Text Size**
- Preferred Currency
- Support Us (Play review link)
- Privacy & Data
- About (version/build, "What's new", "Check for updates")

### Text Size (PR #60) ✅
- Five sizes: Small 0.9, Default 1, Large 1.15, Larger 1.3, Largest 1.45.
- It scales the root `font-size` (`src/lib/textScale.ts`, key `pfm_text_scale`).
- A pre-paint inline script in `layout.tsx` applies it before first render, and `context.tsx` re-applies it after hydration.
- **All font sizes must use rem** (e.g. `text-[0.625rem]`, never `text-[10px]`) so they scale. Bottom-nav labels are deliberately capped with `text-[clamp(8px,0.5rem,10px)]` so the 7 tabs fit.

### Update awareness (PR #61) ✅
- **What's New popup** (`WhatsNewModal.tsx`, data in `src/app/data/whatsNew.ts`):
  - Shown once per release to existing users, after the daily devotionals and before the sign-in prompt.
  - Brand-new installs skip it.
  - It can be reopened from Settings → About → What's new.
  - **To announce an update, add a new entry at the top of `WHATS_NEW` with a new unique `id`** (a date works well).
- **Update prompts** (`UpdateBanner.tsx`) check `/api/app-version` on launch and on every return to the foreground, throttled to once per 60 s:
  - **Web update:** if the server's `VERCEL_GIT_COMMIT_SHA` ≠ the client's baked-in `NEXT_PUBLIC_BUILD_SHA`, it shows "A new update is ready — Refresh".
  - **Play Store update (a popup, since the PR after #72):** if `app_settings.android_latest_build` > the installed `versionCode` (Android app only), it shows a centred "New version available" popup with **Update now** (opens `PLAY_STORE_URL`) and **Remind me later**. "Later" snoozes that build for 24 h; tapping Update snoozes it for 6 h (`pfm_update_snooze`, keyed by build number, so a newer release always prompts again). The Android back button counts as "later". The optional `app_settings.android_update_message` (Admin → Settings → App Updates → "What's new", max 300 chars) is shown inside the popup. It works for every already-installed build, because the code is part of the website.
  - **`android_latest_build` is NOT set yet.** Set it only after a release is **live on Play (approved, not just uploaded)**, either in Admin → Settings → App Updates or directly in the DB; otherwise people are sent to a store page with no update. It is manual because the app cannot ask Google Play what is live. A future option is Google's in-app update API (a Capacitor plugin, which needs a new native build).

### Theme ✅
Light/dark toggle (`pfm_theme`), applied pre-paint.

### Android niceties ✅
- Back button: navigates within the app, and asks for a double-tap before exiting (`BackButtonExit.tsx`).
- Pull-to-refresh.
- Restore last screen after process death (`RouteMemory.tsx`, `pfm_last_path`).
- Splash screen shown once per session.

### Donations ("Support Prayer Fire", `DonationCard.tsx`) ✅ live
- Uses Flutterwave inline checkout. Currencies: NGN, USD, GBP, EUR. Donors are anonymous (email `donor@prayerfiremovement.com`).
- After payment, the client POSTs to `/api/donations`. The server verifies via `GET https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=…`, and checks that both the amount (×100) and the currency match before recording `status: "success"`.
- **Webhook** `/api/donations/webhook`: verifies the `verif-hash` header against `FLW_SECRET_HASH` and marks `charge.completed` + `successful` as success. This is confirmed working in production (Flutterwave log: Delivered, HTTP 200).
- Amounts are stored ×100 (kobo/cents) for consistency with the older Paystack records.
- One early ₦1,000 donation made before the secret key was fixed stays `pending` permanently. That is expected.

### Premium tiers (Partner and Leader) ✅ — Google Play Billing on Android (2026-10-30)
- **Two paid tiers, both sold on Android ONLY through Google Play Billing (via RevenueCat):** **Partner** (`partner_sub`, base plans `partner-monthly`, `partner-yearly`) and **Leader** (`leader_sub`, base plans `leader-monthly`, `leader-yearly`). Starting prices: Nigeria Partner ₦1,500/mo and ₦15,000/yr, Leader ₦3,000/mo and ₦30,000/yr; rest of the world Partner $2.99/$29.99, Leader $5.99/$59.99. Yearly is labelled "2 months free". **No price is hard-coded in the app**: it shows the localized price, currency and trial text that Google Play returns through RevenueCat. The numbers above are typed into Play Console by the owner (the admin Pricing screen then edits them).
- **What each tier unlocks (owner decision):** Partner = the existing premium features (isPremium). **Leader = Partner + creating and managing prayer groups** (`isLeader`; Partner can JOIN groups but not create them; `PrayerGroups.tsx` gates "Create Group"). Analytics, moderation tools and featured groups are NOT built and were removed from the paywall; do not advertise them until they exist.
- **Web (unchanged):** choosing a plan starts a free 7-day trial kept on the device (`upp_trial_start`, `upp_is_premium`). No money is charged on the web, and Flutterwave is NOT used for subscriptions anywhere (only for donations). On Android the local trial flag is ignored (the 7-day trial there is a Play free-trial offer).
- **Android app:** `Capacitor.getPlatform() === 'android'` (hook `useAndroidApp`, `isAndroidApp` from `useApp()`) swaps the pricing screen for `PlaySubscription.tsx`: Partner/Leader cards, Monthly/Yearly toggle (yearly easy to pick, "2 months free"), trial eligibility, **upgrade Partner → Leader** (Play proration mode 2: charged the prorated difference now) and **downgrade Leader → Partner** (mode 6: deferred to the next renewal), **Restore purchases**, **Manage subscription** (opens the Play subscriptions page), and plain-English messages for cancelled/failed payments (`friendlyPurchaseError`, `statusNotice`: grace period, account hold, cancelled but active until the end date, refunded). It never links to or mentions Flutterwave.
- **Who does what:** **RevenueCat** verifies purchases with Google, acknowledges them (within Google's 3 days) and receives Google's live notifications (Pub/Sub RTDN: Google allows ONE topic per app and RevenueCat owns it). Our app does NOT have its own `subscriptionsv2.get` verification or its own Pub/Sub endpoint; this was the owner's explicit choice ("Option 1": keep RevenueCat for verification/acknowledgement/notifications). Everything else is ours (below). The Google purchase token is not stored (RevenueCat does not expose it); the Google order id is stored in `store_transaction_id`.
- **Single source of truth = the `subscriptions` table** (one row per account PER TIER, primary key `(user_id, entitlement)`; written ONLY by the RevenueCat webhook and `/api/subscription/sync`). `GET /api/auth/me` returns `{ user, subscription, freeMode }`; the client keeps them in `useApp()`: `subscription` (the best active row; Leader beats Partner), `isPremium`, `isLeader`, `freeMode`. Re-checked at launch/sign-in, after purchase/restore, and when the app returns to the foreground (at most every 10 minutes).
- **Statuses:** `ACTIVE`, `IN_GRACE` (still has access), `CANCELED` (access until `expires_at`), `ON_HOLD`/`EXPIRED`/`REFUNDED` (no access). A refund ends access straight away. Out-of-order events are ignored (`last_event_at`). `SANDBOX` events (licence testers) are stored with `environment = 'SANDBOX'`. Anonymous RevenueCat ids are ignored. `TRANSFER` moves the rows. Deleting an account removes its `subscriptions` rows but does NOT cancel a Play subscription.
- **Flow:** sign-in → `BillingSync` calls `syncBillingUser(user.id)` (RevenueCat `configure`/`logIn` with `users.id`; `logOut` on sign-out) → purchase in Google Play → RevenueCat calls `POST /api/revenuecat/webhook` → rows saved. After a purchase/restore the app also calls `POST /api/subscription/sync`, which asks RevenueCat's REST API and saves the same result so access turns on at once.
- **Code map:** pure rules `src/lib/subscriptionRules.ts` (tested by `tests/subscriptionRules.test.mts`) and `src/lib/freeModeRules.ts`; database side `src/lib/subscription.ts`, `src/lib/freeMode.ts`; client `src/lib/playBilling.ts` (plugin wrapped in a plain object, never returned from an async function), `src/app/components/PlaySubscription.tsx`, `BillingSync.tsx`, `FreeModeBanner.tsx`; routes `src/app/api/revenuecat/webhook`, `subscription/sync`, `pricing-config`; admin `src/app/components/AdminPricing.tsx` + `src/app/api/admin/billing/**`.
- **Free Premium Mode** (admin → Pricing): one switch with optional start/end date-times; it ends itself (`computeFreeMode` works from the saved dates, nothing needs to run). While active everyone is treated as premium and Leader, the paywall is hidden, and `FreeModeBanner` says "Premium is free for a limited time". Settings live in `app_settings` keys `free_mode_enabled`, `free_mode_start`, `free_mode_end`, `free_mode_existing`. **It does NOT pause anyone's payments**: existing subscribers keep being charged unless billing is deferred (next bullet). The admin screen says so in a warning.
- **Deferring existing subscribers (admin → Pricing, only when "Push their next billing date back" is chosen):** uses RevenueCat's documented defer endpoint (`POST /v1/subscribers/{app_user_id}/subscriptions/{subscription_id}/defer`, `extend_by_days` 1–365), which needs no purchase tokens. It is a manual, previewed, confirmed action (never automatic). Failures are listed per person with the warning that they are STILL CHARGED. Not tried live (no credentials in the build sandbox): the owner must try it on a licence tester first (tick "Include licence testers").
- **Admin Pricing (`/admin` → Pricing tab, admin-only):** lists the real Google Play prices, edit → **Preview change** (old → new, increase/decrease) → **Apply in Google Play**. Increases warn that existing subscribers must accept (Google asks them; optional "move existing subscribers" ticks Play's `migratePrices` OPT_IN); decreases apply to existing subscribers automatically. Every change (who/when/old/new/success or error) is saved in `price_changes` and shown in the change log. Also **promo offers** (percent-off for the first N periods, or a free trial of N days, for new subscribers): created as a DRAFT, shown only after **Activate**. How it is protected: the browser calls `/api/admin/billing` (Next.js, checks `users.role = 'admin'`), which calls the Supabase Edge Function `billing-admin` with the header `x-billing-secret` (`BILLING_FUNCTIONS_SECRET`); the function is not usable without that secret.
- **Edge Function `billing-admin`** (`supabase/functions/billing-admin/index.ts` + pure helpers `pricing.ts`, tested by `tests/pricing.test.mts`; deployed to Supabase project `ebhlmjryezzxtoymoetn`, `verify_jwt` off because it does its own secret check). Actions: `pricing.list|preview|update`, `offers.list|create|activate|deactivate`, `defer.preview|run`. Secrets (Supabase → Edge Functions → Secrets): `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `BILLING_FUNCTIONS_SECRET`, `REVENUECAT_SECRET_API_KEY`, optional `GOOGLE_PLAY_REGIONS_VERSION`. Talks to the Google Play Developer API (`monetization.subscriptions` get/patch, `basePlans:migratePrices`, offers create/activate/deactivate).
- **Product setup (Play Console + RevenueCat + service account + licence testers + secrets):** `docs/PLAY-BILLING-SETUP.md` (click by click, with the licence-tester test table).
- **Honest limits:** the Edge Function and the Google/RevenueCat calls were NOT run against the real services before merge (the build sandbox cannot reach Supabase/Google); the request shapes follow Google's and RevenueCat's documentation, the UI was tested with a simulated Android bridge and mocked responses, and the pure logic has unit tests. First use of each admin action should be Preview / a draft offer / a licence tester. No server-side check of the tier on API routes yet (group data is still local to the device). Web premium is still the client-side trial.
- **Donations are separate and unchanged:** Flutterwave "Partner With Us" donations unlock nothing (verified again 2026-10-30).
- **Build note:** the app's Kotlin plugin (`android/app/build.gradle`, `kotlin_version`) is **2.2.21** because the RevenueCat Android plugin is compiled with Kotlin 2.2; with the old 2.0.21 the Android build fails with "Module was compiled with an incompatible version of Kotlin".

### Admin back office (`/admin`) ✅
- Access is granted to users whose `role = 'admin'`. The account whose email equals `ADMIN_EMAIL` is auto-promoted (self-healing in `getAdminUser`).
- Tabs: overview, users, **feedback** (two views: Messages and Daily activity), requests (partner wall moderation), testimonials, donations, announcements, events, settings.
- The **Feedback** tab:
  - lists in-app feedback, newest first;
  - lets the admin set a status (New / Planned / Done) and a resolution note (e.g. "Fixed in build 14");
  - has a **Copy log** button that copies a dated "feedback → what we did" log for the Play Console production application.
- The Settings tab has these cards:
  - Flutterwave public/secret key (stored in DB)
  - Pricing
  - Social links
  - Daily Morning Exaltation video
  - **App Updates** (`android_latest_build`)
  - App Status (JWT / Google / Admin email / Flutterwave live checks)

### In-app feedback (PR #63) ✅
- **Settings → Send Feedback**, plus a "Have feedback? Tell us 💬" link under the What's New popup.
- The form (`FeedbackModal.tsx`) has a category (🐞 Problem / 💡 Idea / 🙏 Praise / 💬 Other), a message (≤ 2000 characters), and optional name and contact, prefilled when signed in.
- It sends app version/build, platform and current page automatically.
- `POST /api/feedback` is public and links `user_id` when a Bearer token or cookie is present. Data goes into the `feedback` table, which is private (RLS on, no policies).
- **Why it exists:** Google rejected production access for weak tester engagement and feedback. This gives testers an easy channel and gives us a dated record of feedback and fixes.

### Daily activity & reminders (PR #64) ✅
- **Admin → Feedback → "📅 Daily activity"** shows, for any day (Today by default, with ‹ › arrows and a 14-day bar chart you can tap):
  - **Opened the app**: name, phone and the time (Nigeria time) of the first open that day.
  - **Did not open**: registered accounts with no activity that day, with "last opened N days ago", sorted so never-seen and longest-absent come first. Admin accounts are excluded from this list.
  - **Testers who have not signed up yet**: people the admin typed in by hand (one per line, "Name, 0803 123 4567" or an email). They leave the list automatically once an account matches their phone (last 10 digits) or email.
- **Reminders are manual by design.** Each row has a **WhatsApp** button (`wa.me` link with the editable message, `{name}` becomes the first name) and an **email** button (`mailto:`). Bulk helpers: Copy phones, Copy emails, Copy message. The message is saved in `app_settings.tester_reminder_template`. The "✓ Reminded" ticks are stored in the admin's browser only (`pfm_admin_reminded_v1`, reset each day).
- **How activity is recorded:** `/api/auth/me` (called on every app launch for a signed-in user) inserts one row per account per Africa/Lagos day into `user_activity`, `ON CONFLICT DO NOTHING`. Only **signed-in accounts** are tracked; guests are invisible. History starts from the day this shipped.
- Account deletion (`DELETE /api/auth/account`) also deletes that account's `user_activity` rows and strips name/contact/user link from feedback they sent (the message stays as anonymous feedback).
- Phone helpers (`src/lib/reminders.ts`): stored phones are digits without the country code and `users.country_code` holds e.g. "+234". `fullPhone()` builds international digits (a leading 0 is replaced by the dial code; no dial code assumes Nigeria).
- Privacy policy text (`legal.ts` and `/privacy`) was updated to mention feedback and daily app activity. **Play Console → Data safety may need "App activity" declared**; check it before the production application.

### Legal ✅
`/privacy`, `/terms` and `LegalModal` (text in `src/app/data/legal.ts`).

### iOS ⏳
Not started. There is no `ios/` project, and the AlarmEngine is Android-only.

---

## 6. Backend: database and API

### Tables (`src/db/schema.ts`, Postgres, snake_case columns)
| Table | Purpose |
|---|---|
| `users` | id, name, email (unique), phone (unique), country_code, password_hash, provider (`email` / `google`…), role (`user` / `admin`), created_at |
| `partner_requests` | Partner prayer wall: name, location, request, prayers count, approved |
| `subscriptions` | One row per account PER TIER: PK `(user_id, entitlement)` (`partner` / `leader`; `user_id` = `users.id` = RevenueCat app user id), `product_id`, `base_plan_id`, `status` (ACTIVE/IN_GRACE/CANCELED/ON_HOLD/EXPIRED/REFUNDED), `store`, `store_transaction_id` (Google order id), `period_type` (TRIAL/INTRO/NORMAL), `environment` (PRODUCTION/SANDBOX), `expires_at` (access lasts until then), `will_renew`, `last_event_at`, `updated_at`. RLS on, no policies. SQL: `supabase/subscriptions.sql`. Applied in production 2026-10-30 |
| `price_changes` | Admin Pricing log: admin id/email, product, base plan, region, currency, old/new price (micros as text), `applied_to_existing`, `result` (success/error), `error_message`, `created_at`. RLS on, no policies |
| `billing_actions` | Other admin billing actions (free mode switches, deferring billing): admin, `action`, `details` (json), `result`, `created_at`. RLS on, no policies |
| `donations` | name, email, amount (smallest unit ×100), currency, reference (Flutterwave tx_ref), status (`success` / `pending`) |
| `announcements` | title, body |
| `testimonials` | name (null if anonymous), location, testimony, is_anonymous, approved |
| `intercessory_prayers` | user_id (private per user), category, title, details, is_answered |
| `user_activity` | PK (user_id, day): one row per signed-in account per Africa/Lagos day it opened the app; `first_seen_at`. Private (RLS on, no policies). Created 2026-10-06 via migration `create_user_activity_and_testers_tables`. |
| `testers` | Admin's hand-typed tester list: name, phone (international digits), email (lower-case). Private. Same migration. |
| `feedback` | In-app tester feedback: user_id (nullable), name, contact, category (`bug`/`idea`/`praise`/`other`), message, app_version, platform, page, status (`new`/`planned`/`done`), resolution (admin note). Private: RLS on, no policies. Created in production on 2026-10-06 via Supabase migration `create_feedback_table`. |
| `events` | title, description, date (ISO string), time, link |
| `app_settings` | key/value store, edited from Admin. Keys in use: `flutterwave_public_key`, `flutterwave_secret_key`, `price_partner_monthly`, `price_partner_yearly`, `price_leader_monthly`, `price_leader_yearly`, `social_youtube`, `social_facebook`, `social_instagram`, `social_whatsapp`, `social_tiktok`, `daily_youtube_url`, `daily_youtube_title`, `daily_youtube_subtitle`, `android_latest_build` |

- **Schema changes:** edit `schema.ts`, then `npx drizzle-kit push --force`.
- **Then always re-run** `psql "$DATABASE_URL" -f supabase/rls.sql`, because drizzle-kit push disables RLS on the tables it touches. RLS locks the tables away from Supabase's public API; only the Next.js server (via `DATABASE_URL`) talks to Postgres.
- There are no migration files and no `db:*` npm scripts.

### API routes (`src/app/api/**/route.ts`)
| Route | Notes |
|---|---|
| `auth/register`, `auth/login`, `auth/logout`, `auth/me`, `auth/account` | Session in `pfm_token` cookie; `account` = delete / export |
| `auth/google/start`, `auth/google/callback` | Real Google OAuth (state cookie `pfm_oauth_state`, native flag cookie `pfm_oauth_native`) |
| `auth/google` (POST) | ⚠ Legacy **demo** sign-in that creates a demo account. Unused by the UI; see Known Issues |
| `donations` (POST), `donations/webhook` (POST) | Flutterwave verification + webhook |
| `revenuecat/webhook` (POST) | RevenueCat → saves Partner/Leader subscription state (status, refunds, transfers); header `Authorization` must equal `REVENUECAT_WEBHOOK_AUTH` |
| `subscription/sync` (POST, signed-in) | Re-checks the person with RevenueCat's REST API (`REVENUECAT_SECRET_API_KEY`) and saves it |
| `admin/billing` (POST), `admin/billing/free-mode` (GET, PUT), `admin/billing/log` (GET) | Admin Pricing. `billing` is a gated proxy to the `billing-admin` Edge Function (allow-list of actions, adds the verified admin identity, header `x-billing-secret`); `free-mode` reads/saves Free Premium Mode; `log` returns `price_changes` + `billing_actions`. All require `users.role = 'admin'` |
| `flutterwave-config` (GET, public) | Active public key; DB setting overrides env var; reports LIVE/TEST |
| `pricing-config`, `social-links`, `announcements`, `testimonials`, `partner-requests`, `intercessory-prayers` | Public / user content |
| `app-version` (GET, public, `force-dynamic`, `no-store`) | `{ build, androidLatestBuild }`; DB lookup has a 3 s timeout |
| `health` (GET) | `select 1` DB check |
| `feedback` (POST, public) / `admin/feedback` (GET, PATCH, DELETE) | In-app feedback; admin can update status/resolution |
| `admin/activity` (GET `?day=YYYY-MM-DD`) / `admin/testers` (POST, DELETE) | Daily activity lists + the manual tester list. `auth/me` records the daily activity row |
| `admin/*` (me, stats, users, partner-requests, testimonials, donations, announcements, events, settings) | All gated by `getAdminUser` |

---

## 7. Client-side state (localStorage keys)
Most user data lives on the device in `context.tsx` (`AppProvider`) and is persisted to localStorage. Prefixes: `upp_` is legacy ("Unstoppable Prayer Partner"), `pfm_` is newer.

- **Prayer content:** `upp_prayer_points`, `upp_intercessory_prayers`, `upp_intercessory_categories`, `upp_prayer_appointments`, `upp_partner_requests`
- **Progress:** `upp_streak_count`, `upp_last_prayer_date`, `upp_prayed_dates`, `pfm_prayer_total_seconds`
- **Reading:** `upp_bible_favorites`, `upp_bible_translation`, `upp_wisdom_read`, `pfm_bible_last` (where the person last read or listened in the Bible: book, chapter, verse; used by the home screen's "Continue where you stopped")
- **Other features:** `upp_fasting_plan`, `upp_worship_songs`, `pfm_groups` + `pfm_group_messages` (OLD phone-only groups, now only read to offer "Move online"; `pfm_groups_moved` remembers which were moved)
- **Premium:** `upp_is_premium`, `upp_trial_start`
- **Onboarding and popups:** `upp_daily_devotion_shown`, `pfm_alarm_asked`, `pfm_native_alarm_onboarded`, `pfm_whats_new_seen`, `pfm_splash_shown` (sessionStorage)
- **Session:** `pfm_token`, `pfm_user`, `pfm_last_login`, `pfm_last_active`, `pfm_idle_notice`, `pfm_idle_minutes`
- **Preferences and navigation:** `pfm_theme`, `pfm_text_scale`, `preferred_currency`, `pfm_last_path`, `pfm_last_path_at`

Clearing app data on a phone wipes all of the above (except server-synced intercessory prayers and the account).

---

## 8. Key decisions and why

1. **Capacitor shell loading the live Vercel URL (not bundled static files).**
   - Next.js API routes need a server, and one codebase serves both web and Android.
   - Web fixes reach every Android user instantly without Play review.
   - *Cost:* the app needs internet to load (`scripts/web/fallback.html` is the offline fallback in `out/`), and stale WebView copies are possible. The UpdateBanner mitigates that.
2. **Native Kotlin AlarmEngine instead of only local notifications.**
   - Notifications alone are too easy to miss for 4 AM prayer. Testers needed a real alarm-clock experience: full screen, alarm stream, lock screen, survives Doze and reboot.
   - Local notifications remain the fallback for non-Android and for appointments with "Ring like an alarm" off.
   - Never let both fire for the same appointment (see §5, PR #59).
3. **Google sign-in via Custom Tab + custom-scheme deep link** (`com.prayerfireaction.prayerfire://auth-callback?token=`).
   - The WebView can't share cookies with the system browser, and Google blocks OAuth inside embedded WebViews.
   - The JWT is handed back through the deep link, then stored and sent as a Bearer token / cookie.
4. **JWT in an httpOnly cookie, plus a Bearer header fallback**, for the Capacitor WebView.
5. **Admin by email (`ADMIN_EMAIL`)** rather than a separate admin system. It's simple, and the owner can't be locked out.
6. **Settings in the DB (`app_settings`) instead of env vars where the owner must change things.** The owner can change Flutterwave keys, prices, social links and the daily video without redeploying. Env vars remain fallbacks.
7. **Root-font scaling for Text Size** rather than per-component sizes. One setting scales everything consistently. This requires rem-only font sizes.
8. **Update awareness built in-app** (What's New + build-SHA comparison). Testers did not notice silent web updates.
9. **Bundled Bible JSON (~14 MB)** gives offline reading with no third-party Bible API dependency. `bible-api.com` was removed earlier.
10. **Founder credit shortened to "Pastor Jerry C."** The owner chose this to avoid a tribal-identifying surname. Legal and KYC documents keep the full legal name.
11. **Reminders are WhatsApp/email links, not automatic sends.** The app has no email provider or push-notification service, and Google Play never reveals testers' identities (emails), so the admin triggers each reminder from their own phone. Automatic sending would need an email service (e.g. Resend) and/or push notifications (FCM) plus storing consent.
13. **Everyone must sign in (decided 2026-10-09).** Reason: Google Play never shows who tests the app, and Daily activity can only count signed-in accounts, so the owner wanted every open tied to an account. Consequences to remember: (a) **Play "App access"** must give reviewers working sign-in details (an email/phone + password test account) because the app is no longer usable without logging in; (b) there is no guest mode any more; (c) people on a phone with no internet can't sign in for the first time (a returning, already-signed-in user can still open the app offline).
12. **The package name stays `com.prayerfireaction.prayerfire`, even though the owner now has a registered company, Nexus Digital Collective LTD.** The owner asked about `com.nexus.prayerfire` and, after hearing the consequences, chose to keep the current name. The owner's other apps use the same `com.prayerfireaction.*` prefix (`examready`, `churchsms`). Why changing it is costly: Google Play treats a package name as an app's permanent identity, so a different one is a brand-new listing (testers reinstall, on-device data such as prayer points and streaks doesn't carry over, closed-test progress restarts, the deep-link scheme and Play URL change). The name has no legal meaning and need not match the company. If the company ever needs to own the app, options are an app transfer between developer accounts (keeps the package; reports say the 12-tester testing rule can follow the app) or a new Play *organization* account (exempt from the testing rule but requires a D-U-N-S number and a new package). Neither was chosen. If the company becomes the publisher, also revisit: which entity receives donations (Flutterwave), the donation-policy wording for an LTD publisher, and the company name/contact in the Privacy Policy and Terms.

### Payment and Google Play Billing compliance (important)
- **Donations via Flutterwave are allowed and must NOT use Play Billing.** Google Play's Payments policy excludes charitable/ministry donations from Play Billing. Conditions to keep it compliant:
  - Donations must **never unlock any feature or content**. Today they unlock nothing.
  - The UI must present them clearly as gifts to the ministry ("Support Prayer Fire", "100% supports the prayer movement").
- **Premium (Partner and Leader) on Android is sold ONLY through Google Play Billing (RevenueCat), since build 26.** The Android subscription screen has no Flutterwave button, link or wording about paying elsewhere. Google's fee on subscriptions is 15%. The web does not charge anyone today (free trial only); if the web ever charges, keep that flow out of the Android app.
- **⚠ Rule:** never add a Flutterwave (or any other) subscription payment to the Android app. Donations stay Flutterwave-only and must never unlock anything.
- **Play Console → App content:** the in-app purchases answer must now be **Yes** (the app has subscriptions). Update Data safety (purchase history is collected by Google Play / RevenueCat) and the privacy policy mention of RevenueCat.
- History: payments started on **Paystack** and were moved to **Flutterwave**. Paystack required SCUML/KYC documents for a religious organisation, and those drafts are now in `docs/payments/PAYSTACK-*.txt`. They contain the owner's legal details, so keep them out of `public/`.

---

## 9. Environment variables and credentials (names only — never commit values)

### Vercel → Project `prayer-fire` → Settings → Environment Variables (Production)
| Name | Required | Used by | Notes |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | `src/db/index.ts`, `drizzle.config.ts` | Supabase Postgres connection string. App throws on boot without it. |
| `JWT_SECRET` | **Yes** | `src/lib/auth.ts` | Long random string. ⚠ The code has a hard-coded dev fallback if unset; production must set it. Admin → App Status shows whether it is configured. |
| `GOOGLE_CLIENT_ID` | Yes (Google sign-in) | `auth/google/start`, `callback` | Google Cloud OAuth 2.0 Web client. |
| `GOOGLE_CLIENT_SECRET` | Yes (Google sign-in) | `auth/google/callback` | Same OAuth client. |
| `ADMIN_EMAIL` | Yes | `adminAuth.ts`, `adminBootstrap.ts` | The owner's sign-in email; that account becomes admin. |
| `REVENUECAT_WEBHOOK_AUTH` | Yes (Android subscriptions) | `revenuecat/webhook` | Any long random string; must equal the "Authorization header value" set in RevenueCat → Integrations → Webhooks. |
| `REVENUECAT_SECRET_API_KEY` | Yes (Android subscriptions) | `subscription/sync` | RevenueCat secret API key (starts `sk_`), from RevenueCat → API keys. Never put it in the app. |
| `BILLING_FUNCTIONS_SECRET` | Yes (admin Pricing) | `api/admin/billing` | Long random string; must be IDENTICAL to the Supabase Edge Function secret of the same name. |
| `SUPABASE_FUNCTIONS_URL` | Optional | `api/admin/billing` | Defaults to `https://ebhlmjryezzxtoymoetn.supabase.co/functions/v1`. |
| `NEXT_PUBLIC_REVENUECAT_ANDROID_API_KEY` | Yes (Android subscriptions) | `playBilling.ts` (browser) | RevenueCat **public** Android SDK key (starts `goog_`); public by design, but it must be set in Vercel BEFORE the deploy that should use it. |
| `FLW_SECRET_HASH` | Yes (webhook) | `donations/webhook` | Any random string; must match Flutterwave Dashboard → Settings → Webhooks → "Secret hash". |
| `FLUTTERWAVE_SECRET_KEY` | Optional | `donations/route.ts` | Fallback only; the live secret key is stored in DB `app_settings.flutterwave_secret_key` (pasted via Admin). |
| `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY` | Optional | `flutterwave-config` | Fallback only; DB `flutterwave_public_key` takes priority. Live keys start with `FLWPUBK-`. |
| `VERCEL_GIT_COMMIT_SHA` | Automatic | `app-version`, `next.config.ts` | Provided by Vercel; powers the update banner. |

Google Cloud OAuth client settings:
- Authorized redirect URI: `https://prayer-fire.vercel.app/api/auth/google/callback`.
- Add `http://localhost:3000/api/auth/google/callback` for local development.

Flutterwave dashboard settings:
- Webhook URL: `https://prayer-fire.vercel.app/api/donations/webhook`, with the same secret hash as `FLW_SECRET_HASH`.
- Live keys: Settings → API Keys. The secret key starts with `FLWSECK-` and is ~56 characters. It goes into Admin → Settings, not into code.

### GitHub → repo → Settings → Secrets and variables → Actions
| Name | Purpose |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | Base64 of the upload keystore `android/keystore/prayer-fire-upload.keystore` (PKCS12). |
| `ANDROID_KEYSTORE_PROPERTIES` | Full contents of `android/keystore.properties` (storePassword, keyPassword, keyAlias, storeFile). |
| `DATABASE_URL` | Needed by the workflow's `next build` step. |

The keystore files are gitignored (`android/keystore.properties`, `android/keystore/*.keystore|*.jks`). **Losing the upload key** means requesting an upload-key reset from Google Play. The app signing key itself is held by Google (Play App Signing).

### Local `.env` (gitignored) for development
`DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAIL`, and optionally `FLW_SECRET_HASH`, `FLUTTERWAVE_SECRET_KEY`, `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`.

---

## 10. Setup, build and release

### Run the web app locally
```bash
npm install
cp <your env values> .env          # see §9; DATABASE_URL is mandatory
npm run dev                        # http://localhost:3000
npm run typecheck                  # tsc --noEmit
npm run build && npm start         # production build
```
Notes:
- `/api/app-version` returns quickly even without DB access because of its 3 s timeout. Other DB routes will hang or fail without a reachable DB.
- When testing locally in a browser, set `sessionStorage.pfm_splash_shown = '1'` and dismiss the daily popups ("Amen 🙏", "Continue 🙏"). Don't click "Continue with Google".
- Headless Chromium is at `/opt/pw-browsers` in cloud sessions. `playwright-core` can be installed into a scratch dir to take screenshots at a 360 px phone width.

### Ship a web change (most changes)
1. Work on branch `claude/prayer-fire-migration-howcgg`.
2. Open a **draft PR to `main`**. Vercel builds a preview at `prayer-fire-git-claude-prayer-fire-migration-howcgg-pstjerry12.vercel.app`.
3. When the owner says "merge it", **squash-merge**. Vercel auto-deploys production from `main` in under a minute.
4. Add a `whatsNew.ts` entry for user-visible changes. Open apps will show the Refresh bar.

**Branch housekeeping after each squash merge:**
- Restart the branch from main: `git fetch origin main && git checkout -B claude/prayer-fire-migration-howcgg origin/main`.
- Force-push is blocked in this environment. Instead run `git merge -s ours origin/claude/prayer-fire-migration-howcgg -m "Merge origin branch history to allow a fast-forward push"`, then push normally.
- This keeps the tree identical to `main`.

### Ship a native Android change
1. Bump **both** `appVersionCode` (must always increase; Play rejects a reused code, e.g. "Version code 9 has already been used") and `appVersionName` in `android/variables.gradle`.
2. Merge to `main`, then run GitHub Actions → **"Android Release Build"** (`workflow_dispatch`), or push a `v*` tag.
3. Download the artifact `prayer-fire-android-…`, which contains `app-release.aab` and `app-release.apk`.
4. Upload the AAB in Play Console → (Closed testing / Production) → Create new release.
5. After it is live on Play, set `android_latest_build` (Admin → Settings → App Updates) so older installs are prompted.
6. The "no deobfuscation file" warning is expected (`minifyEnabled false`) and can be ignored.

---

## 11. Google Play status (as of 2026-10-06)
- **Closed testing track:** active with 12+ testers.
- **Production access, first attempt: REJECTED on 2026-10-06** ("More testing required"). The application was submitted on 2026-10-03.
  - Google's stated possible reasons: testers were not engaged during the closed test, or testing best practices weren't followed (gathering feedback and acting on it **through updates to the app**).
  - Google requires **another 14 days of closed testing with real testers** before re-applying.
- **Our diagnosis:** Google only sees Play-side signals:
  1. testers installing from Play and opening the app;
  2. private feedback sent through the Play Store;
  3. **new builds uploaded to the closed-testing track**.

  Almost all of our ~30 fixes shipped as **web (Vercel) updates**, which Google cannot see. Only about 3 new AABs were uploaded during the first test.
- **Plan for the second test (2026-10-06 → about 2026-10-20):**
  - Keep ≥ 12 (ideally 15) real testers, each installed **from the Play testing link** and opening the app daily.
  - Ask testers to send **private feedback from the Play Store listing**, in addition to in-app feedback.
  - **Upload a new closed-testing build every 4–5 days** (versionCode 13, 14, 15…), each with release notes describing the tester feedback it addresses.
  - Log feedback and resolutions in Admin → Feedback.
  - Re-apply around 2026-10-20 with answers built from that log.
- **Android developer verification:** package `com.prayerfireaction.prayerfire` is **Registered** with 3 keys. No action needed. The app is distributed only through Play, so the "register keys for outside-Play distribution" banner can be dismissed. Its friendly name still reads "Prayer Fire Movement", which is cosmetic and optional to change.
- Store listing guide and data-safety answers: `docs/PLAYSTORE-RELEASE.md`.

---

## 12. Known issues and bugs
1. **React hydration mismatch (#418) on the Home page.**
   - It is pre-existing. React then re-renders the root and drops attributes set on `<html>` by pre-paint scripts.
   - Mitigated: theme and text scale are re-applied in `context.tsx` effects.
   - Root cause not yet found. It is probably date/locale- or localStorage-dependent render output on `/`.
2. **Premium on the WEB is client-side only** (`upp_is_premium` / `upp_trial_start` in localStorage). It can be bypassed and the trial restarted. That is acceptable only because nothing is sold yet. Real subscriptions need Play Billing with server-side entitlement.
3. ~~Prayer Groups are device-local~~ Fixed: groups are shared and server-side (see §5 Prayer Groups). Moderation, analytics and featured groups are still to be built.
4. **Legacy demo Google route** `POST /api/auth/google` creates or reuses a demo account (`demo.google@prayerfire.example`). It is unused by the UI and should be deleted.
5. **`JWT_SECRET` has a hard-coded fallback** in `src/lib/auth.ts`. If the env var were ever missing in production, tokens would be signed with a public value. Consider throwing in production instead.
6. **Donation verification "demo fallback":** if no Flutterwave secret key is configured at all, `/api/donations` records donations as `success` without verification. That's fine while the live key is set, but risky if it is removed.
7. **Paystack KYC drafts were publicly downloadable until PR #62.** They have been moved from `public/` to `docs/payments/`, so the live site no longer serves them. Two caveats remain:
   - They are still in git history.
   - Older immutable Vercel deployment URLs may still serve them.
   If the repo is or becomes public, consider deleting them and purging history.
8. **Lint is not clean.** `npm run lint` reports pre-existing errors (mainly `react-hooks/set-state-in-effect` and `react/no-unescaped-entities`, e.g. `AccountSettings.tsx`, `admin/page.tsx`). CI runs only `tsc` and `next build`. New code should lint clean.
9. **`package.json` name is still `nextjs-postgresql-template`** (cosmetic).
10. **Pricing FX rates are hard-coded** in `pricingPlans.ts` (e.g. NGN 1500/USD) and go stale.
11. **The service worker caches same-origin GETs cache-first** (stale-while-revalidate), including most `/api/*` responses. Users may briefly see stale announcements and testimonials until the background refresh. `/api/app-version` and **everything under `/api/admin/`** are explicitly bypassed so admin data is never stale. (When testing with Playwright `page.route`, set `serviceWorkers: 'block'` or the service worker will bypass your mocks.)
12. **Earlier "app froze / blank white screen after the alarm" report:**
    - No code cause was found, and all deployments were READY.
    - It was most likely the phone's network reconnecting after Doze woke it for the alarm, since the WebView loads the live site.
    - A "Reconnecting…" UI was offered but not built.
13. **One historical donation stuck `pending`** (made before the secret key was fixed). Expected; leave it.
14. **Account deletion leaves `intercessory_prayers` rows behind** (pre-existing: only the `users` row, activity and feedback links are removed). A user's private prayer points remain in the database after they delete their account. This should be fixed (delete by `user_id`).
15. **Two leftover test rows in `user_activity`** with `user_id = '__test_user__'` (from verifying the migration on 2026-10-06). Harmless (they match no account and are excluded from the history chart) but untidy: delete them from the Supabase SQL editor (`delete from user_activity where user_id = '__test_user__';`). The Supabase MCP tool treats DELETE as destructive and needs a human confirmation, so it timed out in a non-interactive session.

---

## 13. Next tasks (prioritised)
1. **Run the second 14-day closed test (see §11).**
   - Build 13 carries the in-app feedback feature.
   - Ship builds 14 and 15 a few days apart, each fixing real tester feedback, with Play release notes.
   - Re-apply around 2026-10-20. Use Admin → Feedback → Copy log for the "feedback summary" and "changes made" answers.
   - **Once approved:** Play Console → Production → Create new release → "Add from library" (latest closed-test build). Start a **staged rollout of about 20%**, then go to 100%. Set `android_latest_build` to that versionCode once it is live.
2. Keep testers engaged. Keep ≥ 12 opted in, and add a buffer of 2–3. Add a `whatsNew.ts` entry with every user-visible change.
3. **Housekeeping:**
   - Delete the demo `POST /api/auth/google` route.
   - Make `JWT_SECRET` mandatory in production.
4. Fix the Home-page hydration mismatch (#418) at its root.
5. Optional: a "Reconnecting…" / offline screen when the WebView can't reach the live site.
6. Optional: make Prayer Groups real (server tables and APIs) so members actually share prayers and messages.
7. **Google Play Billing is built (build 26, PR #87, draft until the owner says merge).** Remaining are the owner's manual steps (Play Console products and prices, RevenueCat project, service account, Supabase + Vercel secrets, licence-tester test: see `docs/PLAY-BILLING-SETUP.md`), then update the Play Console in-app-purchase declaration, Data safety and the privacy policy. Later: build the Leader extras that were removed from the paywall (analytics, moderation tools, featured groups) before advertising them; decide whether the web should take real payments; check the RevenueCat defer call and the first price change/offer on a licence tester.
8. Optional: rename the friendly name "Prayer Fire Movement" → "Prayer Fire" in Play Console's Android developer verification page (cosmetic).
9. Future: iOS app (needs an `ios/` Capacitor project and an alarm solution; iOS doesn't allow Android-style alarm services).

---

## 14. Recent change log (closed-test period, newest first)
| PR | Change |
|---|---|
| next | **Shared prayer groups, phase 1 of the Leader features (separate branch/PR stacked on #87).** Groups, members, posts (prayer requests, testimonies, messages, alerts), comments, "I'm praying" and daily check-ins moved from phone storage to Supabase with REAL database-level RLS (restricted `app_user` role + `SECURITY DEFINER` functions, `supabase/groups.sql`), `/api/groups`, rewritten `PrayerGroups.tsx`, "Move online" for old phone groups, account deletion cleanup, `tests/groups.test.mts`. Needs `supabase/groups.sql` applied to production before the web code is used. Moderation, analytics and featured groups are the next phases |
| next | **Google Play Billing for Partner and Leader on Android (build 26, versionCode 26 / 1.0.25), PR #87.** RevenueCat plugin (`@revenuecat/purchases-capacitor`) does purchase verification, acknowledgement and Google live notifications; our code does the rest. New: `subscriptions` table (one row per account per tier, statuses, refunds), `price_changes` and `billing_actions` tables, `POST /api/revenuecat/webhook`, `POST /api/subscription/sync`, `/api/auth/me` returns `subscription` + `freeMode`; Android screen `PlaySubscription.tsx` (Partner/Leader, monthly/yearly, upgrade/downgrade, Restore, Manage subscription, clear payment messages); **Leader unlocks creating prayer groups**; Free Premium Mode (dates, banner, paywall hidden); admin Pricing tab (Google Play price editor with preview/increase warning/log, promo offers as drafts, free-mode warning that payments are NOT paused, RevenueCat defer for existing subscribers); Supabase Edge Function `billing-admin` (deployed); Kotlin plugin 2.2.21. Web trial flow and Flutterwave donations untouched. Not run against live Google/RevenueCat (see §5 Honest limits). New env vars: `BILLING_FUNCTIONS_SECRET` (+ optional `SUPABASE_FUNCTIONS_URL`) in Vercel; Supabase function secrets listed in §5. Manual setup: `docs/PLAY-BILLING-SETUP.md` |
| next | **Home screen reordered (web only).** Owner request after seeing the redesign on a phone: the Prayer Fire heading is now first, then the Audio Bible card, then the Verse of the Day; the Start-Up Prayer card was removed (its component and the draft opening prayers were deleted). `page.tsx` now renders the hero above `HomeFold`; `HomeFold` holds only the Bible and verse cards. Then the owner asked for the Start-Up Prayer entry to be pushed down: then (same day) the owner asked for the Write Prayer Point tile to be split in two with Start-Up Prayer taking the other half, which is the layout before the redesign; the temporary horizontal Start-Up card was removed. Everything else on the home page is unchanged. 44 browser checks at 360x640 and 390x844 |
| next | **Home screen redesign (web only, no Android build needed).** The first screen now shows three compact cards without scrolling: Verse of the Day (play button), Start-Up Prayer (today's opening prayer, tap to expand, play button) and the Audio Bible (play starts straight away, "Continue where you stopped", Open Bible). New: `HomeFold.tsx`, `HomeStartUpCard.tsx`, `HomeAudioBibleCard.tsx`, `src/lib/bibleLastPlace.ts` (localStorage `pfm_bible_last`, also written by `BibleReader`), `src/app/data/openingPrayers.ts` (draft prayers for the owner to review), a `compact` variant of `VerseOfTheDayCard`. Everything else on the home page moved below the cards unchanged; the old full-size verse card and the "Holy Bible · Read & Listen" link card were removed (replaced by the new cards). Own branch/PR, independent of the billing and groups PRs (#87 to #91). 40 browser checks at 360x640 and 390x844 (layout, 44px tap targets, offline read-aloud, continue-where-you-stopped, below-the-fold content) |
| next | **Audio Bible visibility, part 2 (Android build 25, versionCode 25 / 1.0.24).** (1) **Welcome slides:** new `WelcomeSlides.tsx` (mounted in `AppShell`), 3 slides (Pray 3x a day / The full Holy Bible / Listen anytime) with Skip and a last-slide "Open the Bible" button. Shown ONCE, right after sign-in, only to someone who has never used the app on this device: localStorage `pfm_welcome_seen` not set AND `upp_daily_devotion_shown` not set (that key is written when the first daily devotional is finished). Existing users never see it (they get What's New). (2) **Share a verse:** new `src/lib/shareVerse.ts` + a "Share" row in `VerseActionSheet` (`onShare` prop; wired in `BibleReader`, `PrayerVerseCard`, `bible/prayer/[id]`). Shares "reference (translation) - text" plus "Read & listen to the Bible free in Prayer Fire: https://prayer-fire.vercel.app/bible". Uses the new **`@capacitor/share` plugin** (package.json, `npx cap sync android` updated `android/capacitor.settings.gradle`, `android/app/capacitor.build.gradle`, `assets/capacitor.plugins.json`): in the Android app it opens the native share sheet ONLY AFTER build 25 is installed; before that, and in browsers without Web Share, it copies the same message to the clipboard and tells the user to paste it. It shares TEXT, not an image. Plugin is imported and used in place (never returned from an async function: see the Capacitor proxy note). |
| next | **Audio Bible visibility (Android build 24, versionCode 24 / 1.0.23).** Goal: show that Prayer Fire is a prayer app AND an Audio Bible. `BottomNav.tsx` label "KJV Bible" → "Bible" (it was already its own tab; Home stays the first tab and holds the alarm schedule). `VerseOfTheDayCard.tsx` redesigned with **Read** / **Listen** buttons (new `showRead` prop; the Bible page passes `false`), now also on the home screen above the primary actions; verse still picked by day-of-year from the bundled `KJV_BIBLE_VERSES` (no API). `BibleReader.tsx`: floating **Listen** button (`onListen`, `autoListenRef` for taps made before a chapter is open), one-time tip (`pfm_listen_tip_seen`, auto-hides after 12 s), `SavedPosition.verse` so the home "Read" button opens the chapter with the verse selected. Home Bible card renamed "Holy Bible · Read & Listen"; manual page gets a Listen step; `whatsNew.ts` gets a 2026-10-24 entry ("Full Holy Bible, offline, with Audio...") which doubles as the welcome message because the app has NO onboarding screens (WhatsNewModal is shown once to existing users; new installs skip it). New `STORE_LISTING.md` (title options because the requested 33-char title is over Play's 30 limit, short + full description, 5 screenshot captions with #2 = Bible reader with Listen). No change to payment, donation, auth or alarm code. Offline check: Bible text works offline after first load (service worker cache); read aloud uses device TTS and the native voice filter skips network-only voices, but it could not be tested on a real phone offline |
| next | **Fix: read aloud was silent in the Android app.** Cause: `getNativePlugin()` in `readAloud.ts` returned the Capacitor plugin Proxy straight from an async function; a Capacitor plugin answers to any property incl. `then`, so JS called `plugin.then()` natively ("not implemented") and the read failed before any speech (no native call, no browser fallback, no message). Now `getNative()` returns `{ plugin }` (same wrapper pattern as `capacitorAlarm.ts`), never caches "not android yet", and a native failure falls back to the browser engine; failures show a `Details:` line in the read-aloud banner. Verified with a simulated Android bridge (old code: no native call, silence; new code: `warmUp`/`addListener`/`speakQueue` and per-verse progress). Web-only fix: works with the already-released build 23. Kotlin tweak (not yet in a released build): the voice hint list only picks installed, offline voices (`isNetworkConnectionRequired` filtered out); no version bump, picked up by the next build |
| next | **Study features + narrator read-aloud (Android build 23, versionCode 23 / 1.0.22).** Read aloud: `src/lib/readAloud.ts` rewritten around `readItems()` (one utterance per verse, `onItemStart` for highlight/scroll, soft pause/resume, stop) with ALL voice choices in `src/lib/voiceConfig.ts` (rate 0.9, pitch 0.85, browser voice list Microsoft Guy/Ryan, Google UK English Male, Daniel, any "male"; Android voice-id list; a disabled `cloud` placeholder for ElevenLabs — cloud TTS is NOT built). Native `SpeechEnginePlugin` gained `speakQueue` (per-verse `verseStart` events, voice hints) and `warmUp`; `VoicePreloader` preloads voices at app start. Bible reader: tap = soft-select (multi), hold 1 s = `VerseActionSheet` (Copy as `John 3:16 (KJV) - …`, Read Aloud, Bookmark, Highlight colour, Add to Sermon Notes); Read Aloud reads the selected verses in order, else the chapter from verse 1; the verse being read is highlighted and scrolled to; floating `ReadAloudBar` (Pause/Resume/Stop); stops on chapter change/leaving. Also search across the Bible + quick jump (`BibleSearchBar`, `lib/bible/search.ts`, `lib/bible/reference.ts`), reader font size A−/A+, Verse of the Day card. **My Study** (`/study`: Bookmarks grouped by day, Highlights grouped by colour, Sermon Notes; `/study/sermon/[id]`) stored local-first in localStorage `pfm_study_v1` (`src/lib/study.ts`, merge rules in `studyMerge.ts`, old `pfm_bookmarks` imported once) and synced for signed-in users by `StudySync` → `/api/study` (table `user_study`, created in Supabase, RLS on/no policies like the other private tables; merge is last-write-wins per record on both phone and server). Prayer Verses: topic page `/bible/topic/[category]`, each verse opens `/bible/prayer/[id]` (full page, large text); hold = Copy/Read Aloud/Bookmark. The old `/bible/verse/...` page remains (reached from Bookmarks/Sermon notes). Web parts ship at merge; the narrator voice/verse highlighting in the app needs build 23 |
| #80 | **Read aloud fix + verse pages + bookmarks (Android build 22, versionCode 22 / 1.0.21).** Read aloud: `window.speechSynthesis` does nothing in the Android WebView, so new native plugin `SpeechEngine` (`android/.../speech/SpeechEnginePlugin.kt`, Android TextToSpeech; manifest `<queries>` TTS_SERVICE; registered in MainActivity) used first by `src/lib/readAloud.ts`; installs without the plugin and plain browsers fall back to speechSynthesis, now chunked per sentence (Chrome cut long chapters off). Bible: tapping a verse opens `/bible/verse/[osis]/[chapter]/[verse]` (verse page: read aloud/copy/bookmark/share/prev-next); reader position is kept in sessionStorage so Back returns to the chapter. Prayer Verses: tapping a topic opens `/bible/topic/[category]`. Holding any verse 2 seconds (`LongPressable`) highlights it and shows Copy + Bookmark (`VerseActionBar`). Bookmarks live in localStorage `pfm_bookmarks` (`src/lib/bookmarks.ts`), shown in a new Bookmarks tab on /bible; the old Prayer Verses hearts (`upp_bible_favorites`) are migrated once. Web parts ship via Vercel at merge; the read-aloud fix inside the app needs build 22 |
| #79 | Android build 21: versionCode 21 (1.0.20), requested by the owner because Play said version code 20 was already used when uploading; no code change since build 20 |
| next | Android build 19: versionCode 19 (1.0.18), requested by the owner; no native code change since build 18 |
| next | **Quieter alarm (Android build 20, versionCode 20 / 1.0.19):** `AlarmRingService` no longer forces the ALARM stream to 100%; it sets it to `ALARM_VOLUME_PERCENT` (50) of the phone's max (change that constant to taste). Build 19 was never uploaded to Play, so upload 20 instead |
| #77 | **Stay signed in until sign-out:** idle auto sign-out is now OFF by default (server default `idleLockMinutes` 0, client default 0, `app_settings.idle_lock_minutes` set to `0` in production, cache key bumped to `pfm_idle_minutes_v2` so phones drop the old cached 30). The admin card "Sign-in & Auto Sign-out" still exists to turn it back on. Login now lasts 1 year (`TOKEN_MAX_AGE`/JWT 365d, was 30d) so people are only signed out by tapping Sign out, a password change/account deletion, or clearing app data. The sign-in wall still appears for anyone who is signed out |
| #75 | Alarm fix + popup + Stop opens app (Android build 18, versionCode 18 / 1.0.17). Native: `AlarmRingService` now keeps ONE process-wide MediaPlayer, released before every start and by every stop (before, a second start while ringing orphaned a looping player that Stop could not reach — a tester's alarm rang until the process was killed by an update); new `AlarmStopActivity` (invisible) behind the notification Stop button and the DISMISS button silence the alarm via `AlarmRingService.stopRinging()` and open the app so users land on sign-in. Web: sign-in popup is vertically centered, never taller than the screen (form scrolls inside), and the app shows blurred behind it instead of a solid page |
| #74 | Android build 17: versionCode 17 (1.0.16), requested by the owner; no native code change since build 14 |
| #73 | Update popup: Play Store "New version available" popup (Update now / Remind me later, 24 h snooze) replacing the top bar for Android updates; optional "What's new" message in Admin → App Updates; `/api/app-version` returns `androidUpdateMessage` |
| #71 | Prayer Verses: 50 KJV verses in each of the 10 themes (500 total), generated from the bundled KJV |
| #72 | Android build 16: versionCode 16 (1.0.15), requested by the owner; no native code change since build 14 |
| #70 | Android build 15: versionCode 15 (1.0.14), requested by the owner; no native code change since build 14 |
| #69 | Security upgrade: Next.js 16.2.11, postcss 8.5.23, eslint-config-next 16.2.11 (with lock file); Dependabot #4 closed |
| #67–#68 | **Sign-in wall + idle auto sign-out** (`SignInGate`, `SessionGuard`, `googleSignIn.ts`), `/api/app-version` returns `idleLockMinutes`, admin "Sign-in & Auto Sign-out" card, `/me` sends Bearer token (fixes uncounted Android opens) and returns 503 on errors, What's New entry |
| #66 | Android build 14: versionCode 14 (1.0.13) |
| #65 | Bible reader: plain Book / Chapters / Verses labels, always clickable |
| #64 | Admin → Feedback → Daily activity (who opened the app, who didn't, WhatsApp/email reminders, manual tester list); `user_activity` + `testers` tables; activity recorded in `/api/auth/me`; service worker no longer caches `/api/admin/*`; admin bottom padding; privacy text; Android workflow artifact-name fix |
| #63 | In-app Send Feedback (Settings + What's New link), `feedback` table, Admin → Feedback tab with Copy log; versionCode 13 (1.0.12) for the second closed test |
| #62 | PROJECT_HANDOFF.md; Paystack drafts moved out of `public/`; stray files removed |
| #61 | What's New popup + update banner (web build SHA / Play `android_latest_build`), `/api/app-version`, SW bypass |
| #60 | App-wide Text Size setting, px→rem font conversion, "Aa" shortcut, Bible picker overflow fixes |
| #59 | Alarm no longer "comes back" after Stop (skip duplicate local notification on Android); credit → "Pastor Jerry C." |
| #58 | "Stop" action on the alarm notification (native; versionCode bump) |
| #56–57 | Rename app to "Prayer Fire" (group name kept); versionCode 11 |
| #54–55 | Close Google sign-in Custom Tab + auth modal after deep-link return; versionCode 10 |
| #53 | In-app "leave us a review" link |
| #40–52 | Google sign-in in Custom Tab (+ `<queries>` fix), alarm reliability root-cause fixes (native detection race, permission/scheduling collision, thenable plugin loaders), admin status fix, social links + TikTok, Daily Morning Exaltation card |
| #30–39 | Back-button behaviour, swipe navigation in Start-Up Prayer, bell-peal celebration sound, pull-to-refresh, restore last screen, app version in Settings |
