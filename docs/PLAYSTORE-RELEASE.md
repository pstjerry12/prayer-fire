# 🚀 Launching Prayer Fire Movement on Google Play

Everything in this repo is already wired up for the Play Store. This guide walks
you from "code on GitHub" to "live on the Play Store".

---

## 0. What is already done ✅

| Item | Where |
|---|---|
| Native Android project | `android/` (Capacitor 8, `com.prayerfire.app`) |
| Launcher + adaptive + round icons (all densities) | `scripts/generate-android-assets.sh` |
| Splash screens (portrait + landscape, all densities) | `scripts/generate-android-assets.sh` |
| Status-bar notification glyph `ic_stat_icon_config_sample` | `scripts/generate-android-assets.sh` |
| Alarm sound `res/raw/beep.wav` | `scripts/generate-android-assets.sh` |
| Permissions: notifications, exact alarms, boot restore | `android/app/src/main/AndroidManifest.xml` |
| **Upload signing key (30-year, valid to 2056)** | `android/keystore/prayer-fire-upload.keystore` |
| Signing config wired into Gradle | `android/app/build.gradle` + `android/keystore.properties` |
| CI that builds the signed AAB (no Android Studio needed) | `.github/workflows/android-release.yml` |
| Store icon (512×512) + feature graphic (1024×500) | `store-assets/` |
| targetSdk 36 | `android/variables.gradle` |

> ⏰ **Timing note:** Google requires new apps and updates to target
> **Android 16 (API 36)** from **31 August 2026**. This project already targets 36,
> so you are compliant on day one — but if you ever lower it, Play Console will
> block the upload outright.

**Certificate fingerprints** (needed if you ever add native Google Sign-In or
Firebase — get them any time with
`keytool -list -v -keystore android/keystore/prayer-fire-upload.keystore`):

```
SHA-256: 50:77:3A:5D:AA:75:46:9E:B2:6F:13:F6:A8:1F:3F:02:70:18:88:89:90:64:2B:55:B7:B5:83:00:1F:71:EC:A9
```

> 🔒 The keystore and its passwords live in `android/keystore/` and
> `android/keystore.properties`. Both are **gitignored**. Back them up outside
> this machine — if you lose them, use *Play Console → Setup → App signing →
> Reset upload key*.

---

## 1. Build the signed AAB

### Option A — GitHub Actions (recommended, zero setup)

1. Push this repo to GitHub.
2. Add two secrets (**Settings → Secrets and variables → Actions**):

   | Secret | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | `base64 -w0 android/keystore/prayer-fire-upload.keystore` |
   | `ANDROID_KEYSTORE_PROPERTIES` | the full contents of `android/keystore.properties` |

   (macOS: pipe to `pbcopy` · Linux: `xclip -selection clipboard` · Windows: `clip`)

3. **Actions → Android Release Build → Run workflow.**
4. Download the artefact — it contains `app-release.aab` **and** `app-release.apk`.

### Option B — locally

You need JDK 21 and the Android SDK (API 36) — i.e. Android Studio, or
[command-line tools only](https://developer.android.com/studio#command-line-tools-only).

```bash
bash scripts/generate-keystore.sh   # only if android/keystore.properties is missing
bash scripts/build-mobile.sh        # signed AAB + APK
bash scripts/build-mobile.sh debug  # quick installable test build
```

Artefacts land in:

```
android/app/build/outputs/bundle/release/app-release.aab   ← upload this
android/app/build/outputs/apk/release/app-release.apk      ← sideload/share
```

---

## 2. Create the app in Play Console

1. Buy the one-time **$25** developer account → <https://play.google.com/console>
2. **Create app**:
   - App name: `Prayer Fire Movement`
   - Default language: English (US) — or your primary market
   - App or game: **App**
   - Free or paid: **Free**
3. Accept **Play App Signing** (leave "Export and upload a key from Java keystore"
   unchecked — Google generates and holds the app signing key; your new upload key
   signs what you submit). This is the safest option: Google can then re-sign and
   optimise your app for each device.

---

## 3. Store listing (copy-paste ready)

**Main store listing** → paste these:

### App name
```
Prayer Fire Movement: Pray 3x
```

### Short description (80 char max — this is your headline)
```
Pray 3x a day with alarms, Bible, prayer groups & fasting. Keep the fire burning.
```

### Full description (4000 char max)
```
Prayer Fire Movement is a global community learning to pray three times a day — a cure for prayerlessness.

KEEP THE FIRE ON THE ALTAR
Set personal prayer appointments and get real alarms that ring on time, even if your phone is asleep or the app is closed. Notifications survive a restart, so your 4 AM watch is never missed.

PRAY WITH BELIEVERS EVERYWHERE
Join the partner network and pray for real requests from around the world. Tap to pray for someone and let them know they are not alone.

GROW IN THE WORD
Read the Bible, save Scriptures to your vault, and receive a daily verse and daily wisdom to anchor your day.

BUILD A PRAYER LIFE THAT LASTS
• Customisable prayer schedule with morning, midday and night watches
• Fasting tracker to keep a record of your consecration
• Prayer groups and the startup prayer for new believers
• Worship and wisdom sections to keep your heart burning
• Start-up prayer and prayer workshop for beginners

WHY 3 TIMES A DAY?
Daniel prayed three times a day. So did David and the early Church. Prayer Fire Movement revives that rhythm — not as a rule, but as a relationship. Small, consistent watches of prayer rebuild a life of communion with God.

Free to use. Your prayer data stays yours.

Prayer Fire Movement — Pray 3x. A cure for prayerlessness.
```

### Graphic assets

| Asset | File | Spec |
|---|---|---|
| App icon | `store-assets/app-icon-512.png` | 512×512, 32-bit PNG |
| Feature graphic | `store-assets/feature-graphic-1024x500.png` | 1024×500, JPEG or 24-bit PNG |
| Phone screenshots | *(capture your own — see below)* | 2–8 images, 1080×1920 or 1440×2560 |
| 7" / 10" tablet screenshots | optional | 2–8 images each |

**Capturing real screenshots** (Play rejects mocked-up "screenshots" that are
just marketing images):

```bash
adb shell settings put global window_animation_scale 0
adb shell settings put global transition_animation_scale 0
adb exec-out screencap -p > 01-home.png
```

Suggested 8 shots: Home, Prayer Schedule (with alarms), Bible Reader,
Scripture Vault, Partner Network, Prayer Groups, Fasting Tracker, Admin-free
user profile. `store-assets/screenshot-template-1080x1920.png` shows the safe area.

### Contact details
- Website: `https://prayer-fire.vercel.app`
- Privacy policy: `https://prayer-fire.vercel.app/privacy` *(required — you already have this page live)*
- Email: `prayerfiremovemnt@gmail.com`

---

## 4. App content questionnaire (the part that blocks most submissions)

| Section | Answer |
|---|---|
| **App access** | "All functionality is available without restrictions" |
| **Ads** | No, my app contains no ads |
| **In-app purchases** | **No** — Paystack/donations are removed from the public app |
| **Content rating** | Questionnaire → no violence, no user-to-user chat, no gambling, no mature themes → typically **Rated for 3+** |
| **Target audience** | 18 and under? **No** → age 18+. Select "not child-directed" |
| **Data safety** | see table below |

### Data safety form

| Question | Answer |
|---|---|
| Does your app collect or share user data? | **Yes** |
| Data collected | **Email address**, **Name**, **Phone number** (account creation), **App interactions** (prayer schedule stored locally) |
| Is data encrypted in transit? | **Yes** (HTTPS to your Vercel app) |
| Can users request data deletion? | **Yes** — account can be deleted in the app (Settings → Account) — confirm this works before answering yes, otherwise answer No |
| Is data shared with third parties? | **No** |
| Data used for | Account management only. **Not** for advertising, analytics or personalisation |

> ⚠️ Answering this form inaccurately is the #1 cause of removals later. Re-check
> it whenever you re-enable Paystack donations.

---

## 5. Release tracks — the 12-tester / 14-day gate

⚠️ **This is the single biggest blocker for a first-time publisher, so plan for it.**

> If your Play Console account is a **personal** account created after
> 13 Nov 2023, you **cannot** publish to production until you have run a closed
> test with **at least 12 testers who stayed opted in for 14 consecutive days**.
> (Google cut this from 20 to 12 testers in Dec 2024; the 14 days never changed.)
> After the 14 days you submit a short production-access application; review is
> usually ≤ 7 days.

**Organization accounts are exempt** from the whole requirement. Since you are
already registering a business name for Paystack, that is worth knowing: an
organization Play Console account skips the 14-day gate — but it needs a DUNS
number and takes weeks to verify. For a first launch, do the personal + 14-day
route and start the clock **today**.

1. **Internal testing** (day 0, just you)
   - Testing → Internal testing → Create release → upload `app-release.aab`
   - Add your own Gmail as a tester, install from the opt-in link
   - **Verify**: the alarm fires with the screen locked, the sound plays, and
     alarms come back after a reboot. Fix anything broken *before* recruiting testers.
2. **Closed testing** (day 1 → day 14+)
   - Create a closed track, add an email list, invite **20–25 people** even though
     only 12 count — testers who uninstall on day 11 reset your clock.
   - Recruit from your prayer groups / partner network; you already have a
     community to draw from.
   - Keep them active: post a short "pray with us" message and ask for feedback
     (Google looks at real engagement, not just the headcount).
3. **Apply for production access** (after day 14)
   - Answer the three sections honestly and specifically — describe the alarm
     scheduling, the prayer wall, the Bible reader. Vague one-line answers are a
   common reason for rejection.
4. **Production → Create release** → countries → roll out.

---

## 6. ⚠️ The one real rejection risk: "minimum functionality"

Google's [WebView spam policy](https://support.google.com/googleplay/android-developer/answer/9888070)
rejects apps that are "only a repackaged website". Your app **has** native value —
make it obvious to the reviewer:

- ✅ **Exact native alarms** (`SCHEDULE_EXACT_ALARM`) that fire while the phone sleeps — impossible in a browser tab.
- ✅ **Boot restore** — alarms are re-scheduled after restart.
- ✅ **Custom alarm sound and vibration.**
- ✅ **Haptic feedback.**

Practical tips:
- **Do not** list the app as "a wrapper for our website" anywhere in the listing.
- Do mention "works offline-safe with alarms that keep running".
- If a reviewer asks for a demo video, record the alarm firing with the screen off.
- Keep the web app fast — a 10-second first load reads as "broken app" to a reviewer.

---

## 7. Releasing an update

```bash
# 1. bump the version (android/variables.gradle)
appVersionCode = 2          # must ALWAYS increase
appVersionName = "1.1.0"

# 2. if the web app changed, ship that to Vercel — the app picks it up instantly,
#    no Play update needed:
git push        # (Vercel deploys)

# 3. only when native code/permissions change do you need a new AAB:
bash scripts/build-mobile.sh        # or re-run the GitHub Action
```

Then Play Console → Production → Create release → upload the new AAB.

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| `Keystore file not found for signing config 'release'` | `android/keystore.properties` is missing or its `storeFile` path is wrong → re-run `scripts/generate-keystore.sh` |
| Play rejects "versionCode already used" | bump `appVersionCode` in `android/variables.gradle` |
| Play rejects the icon | re-run `bash scripts/generate-store-assets.sh` (8-bit PNG) |
| Alarms don't fire on Android 14+ | Settings → Apps → Prayer Fire → Alarms & reminders → **Allow exact alarms**. Also ensure the user granted notification permission. |
| App shows the branded fallback page | the device is offline — expected; content returns when the network does |
| Google Sign-In fails inside the app | Google blocks OAuth inside embedded WebViews. Sign in with email/phone in the app, or keep Google sign-in for the browser. |

---

## 9. Optional next steps

- **Deep links (open `prayer-fire.vercel.app` links in the app):** publish
  `public/.well-known/assetlinks.json` with your SHA-256 fingerprint, then add an
  `AUTOVERIFY` intent filter to `MainActivity` in the Android manifest.
- **Push notifications** (broadcast prayer alerts): add Firebase Cloud Messaging
  plus `@capacitor/push-notifications`.
- **Crash reporting:** Sentry's Android + Next.js SDKs.
- **Re-enable donations** once the Paystack business name is registered — the
  admin Settings tab and `/api/donations` webhook are still in place.
