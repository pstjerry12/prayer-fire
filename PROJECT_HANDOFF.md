# Prayer Fire — Project Handoff

> **Read this first.** This file is the single source of truth for resuming work on Prayer Fire in a fresh session.
> Last updated: **2026-10-06**, after Google's first production-access rejection, the in-app feedback feature (PR #63) and the Daily activity / reminders admin view (PR #64).
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
| Android package / applicationId | `com.prayerfireaction.prayerfire` |
| Live web app | `https://prayer-fire.vercel.app` (Vercel, Next.js) |
| GitHub repo | `pstjerry12/prayer-fire` |
| Play Store URL | `https://play.google.com/store/apps/details?id=com.prayerfireaction.prayerfire` (`PLAY_STORE_URL` in `src/lib/capacitorAlarm.ts`) |
| Current Android version | `versionCode 13`, `versionName "1.0.12"` in `android/variables.gradle`. Build 13 was prepared for the second closed test; check Play Console for what is actually uploaded. |

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
| next | 16.2.6 (App Router) |
| react / react-dom | 19.2.6 |
| typescript | 5.9.3 |
| tailwindcss / @tailwindcss/postcss | 4.1.17 (v4, `@theme` tokens in `src/app/globals.css`) |
| drizzle-orm / drizzle-kit | 0.45.2 / 0.31.10 |
| pg / @types/pg | 8.20.0 / 8.18.0 |
| jose (JWT) | ^6.2.8 |
| bcryptjs | ^3.0.3 |
| lucide-react (icons) | ^1.31.0 |
| dotenv | 17.3.1 |
| eslint / eslint-config-next | 9.39.4 / 16.2.6 |
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
- KJV, ASV and WEB are bundled as JSON, so it is **fully offline**.
- 3-step flow: Book → Chapters → Verses (`BibleReader.tsx`). The Android back button steps back through it.
- Favorites (`upp_bible_favorites`) and translation choice (`upp_bible_translation`) are saved.
- `BibleLibrary.tsx` holds the "Prayer Verses" collection.

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

### Prayer Groups (`/groups`) 🟡
Premium-gated. **Groups and messages are stored only in localStorage on the device** (`pfm_groups`, `pfm_group_messages`), so they are not shared between users yet. The seed group is "Prayer Fire Movement".

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
- One-time sign-in prompt after the devotionals (`pfm_auth_prompted`).
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
- **Update bar** (`UpdateBanner.tsx`) checks `/api/app-version` on launch and on every return to the foreground, throttled to once per 60 s:
  - **Web update:** if the server's `VERCEL_GIT_COMMIT_SHA` ≠ the client's baked-in `NEXT_PUBLIC_BUILD_SHA`, it shows "A new update is ready — Refresh".
  - **Play Store update:** if `app_settings.android_latest_build` > the installed `versionCode` (Android only), it shows "New version available — Update", linking to the Play Store.
  - **`android_latest_build` is NOT set yet.** Set it only after a release is live on Play, either in Admin → Settings → App Updates or directly in the DB.

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

### Premium tiers ("Prayer Fire Partner" / "Fire Partner Leader") 🟡 — NO real billing
- `PricingPage.tsx` shows Partner at $2.99/mo ($23.99/yr) and Leader at $9.99/mo ($89.99/yr). The admin can override prices via `price_*` settings and `/api/pricing-config`. Prices are converted to local currencies with static FX rates in `pricingPlans.ts`.
- **Choosing a plan only starts a free 7-day trial, stored on the device** (`upp_trial_start`, `upp_is_premium`). **No money is charged anywhere.** See §8 (Play Billing).

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
- **Reading:** `upp_bible_favorites`, `upp_bible_translation`, `upp_wisdom_read`
- **Other features:** `upp_fasting_plan`, `upp_worship_songs`, `pfm_groups`, `pfm_group_messages`
- **Premium:** `upp_is_premium`, `upp_trial_start`
- **Onboarding and popups:** `upp_daily_devotion_shown`, `pfm_auth_prompted`, `pfm_alarm_asked`, `pfm_native_alarm_onboarded`, `pfm_whats_new_seen`, `pfm_splash_shown` (sessionStorage)
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

### Payment and Google Play Billing compliance (important)
- **Donations via Flutterwave are allowed and must NOT use Play Billing.** Google Play's Payments policy excludes charitable/ministry donations from Play Billing. Conditions to keep it compliant:
  - Donations must **never unlock any feature or content**. Today they unlock nothing.
  - The UI must present them clearly as gifts to the ministry ("Support Prayer Fire", "100% supports the prayer movement").
- **Premium tiers (Partner/Leader) currently charge nothing.** The trial is a free on-device flag, so there is no policy problem today.
- **⚠ Rule for the future:** if the owner wants to actually charge for Partner/Leader (digital subscriptions), the **Android app MUST use Google Play Billing**. Use a Play Billing library or a Capacitor plugin with server-side purchase verification. **Never** charge for subscriptions through Flutterwave inside the Android app. That is the most likely cause of a Play removal. Google's fee on subscriptions is 15%. Web-only users can be charged through other providers, but the Android app must not link out to them for that purchase.
- In Play Console → App content, answer **"No in-app purchases"** until Play Billing exists.
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
2. **Premium is client-side only** (`upp_is_premium` / `upp_trial_start` in localStorage). It can be bypassed and the trial restarted. That is acceptable only because nothing is sold yet. Real subscriptions need Play Billing with server-side entitlement.
3. **Prayer Groups are device-local** (`pfm_groups`, `pfm_group_messages`). They are not shared between users despite the "community" framing.
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
7. **Only when the owner wants revenue from Partner/Leader:** integrate **Google Play Billing** for Android subscriptions, with server-side receipt verification and entitlements stored in the DB. Then update the Play Console in-app-purchase declaration. Do not use Flutterwave for subscriptions inside the Android app.
8. Optional: rename the friendly name "Prayer Fire Movement" → "Prayer Fire" in Play Console's Android developer verification page (cosmetic).
9. Future: iOS app (needs an `ios/` Capacitor project and an alarm solution; iOS doesn't allow Android-style alarm services).

---

## 14. Recent change log (closed-test period, newest first)
| PR | Change |
|---|---|
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
