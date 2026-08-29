# Prayer Fire Movement — Android (Capacitor 8)

A thin native shell around the live web app. The WebView loads
**https://prayer-fire.vercel.app** (see `capacitor.config.ts → server.url`), so
every web deploy reaches installed phones instantly, with **no** Play Store
update. What the shell adds is what a browser cannot do:

| Native capability | How |
|---|---|
| Exact alarms that ring while the phone sleeps | `@capacitor/local-notifications` + `SCHEDULE_EXACT_ALARM` |
| Alarms survive a reboot | plugin's `LocalNotificationRestoreReceiver` + `RECEIVE_BOOT_COMPLETED` |
| Custom alarm sound & vibration | `res/raw/beep.wav`, `iconColor: #E05050` |
| Status-bar glyph | `drawable-*/ic_stat_icon_config_sample.png` |
| Haptics | `@capacitor/haptics` |

## Build

```bash
npm ci                                   # install web + Capacitor deps
bash scripts/generate-keystore.sh        # once — creates the upload key
bash scripts/build-mobile.sh             # signed AAB + APK
bash scripts/build-mobile.sh debug       # installable debug build
```

No JDK/Android SDK on your machine? Push to GitHub and run
`.github/workflows/android-release.yml` instead — it produces the same signed
artefacts. Full walkthrough: [`docs/PLAYSTORE-RELEASE.md`](../docs/PLAYSTORE-RELEASE.md).

## Project layout

```
android/
├── app/
│   ├── build.gradle              # versioning + release signing config
│   ├── keystore.properties       # 🔒 gitignored — passwords for the upload key
│   ├── keystore/
│   │   └── prayer-fire-upload.keystore   # 🔒 gitignored upload key (valid to 2056)
│   └── src/main/
│       ├── AndroidManifest.xml   # permissions: notifications, exact alarms, boot
│       ├── java/com/prayerfire/app/MainActivity.java
│       └── res/                  # icons, splash screens, beep.wav — all generated
├── variables.gradle              # SDK versions + appVersionCode / appVersionName
└── gradlew
```

## Changing the branding

Everything in `res/` is generated from one file — `public/logo.png`. Edit that,
then:

```bash
bash scripts/generate-android-assets.sh      # launcher, splash, notification glyph, beep
bash scripts/generate-store-assets.sh        # Play Store icon + feature graphic
```

## Releasing an update

1. `android/variables.gradle` → bump `appVersionCode` (must always increase) and `appVersionName`.
2. Web-only changes need **no** new build — deploy the site and the app updates itself.
3. Native/permission changes → rebuild the AAB and upload to Play Console.

## Version requirements (checked 2026)

- `compileSdkVersion` / `targetSdkVersion` = **36** — meets Play's API-level policy.
- `minSdkVersion` = **24** (Android 7.0) — covers ~99% of active devices.
- Gradle 8.14.3, AGP 8.13.0, **JDK 21** required to build.
