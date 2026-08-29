#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Prayer Fire Movement — Android release build
#
#   bash scripts/build-mobile.sh            → signed AAB (Play Store) + APK
#   bash scripts/build-mobile.sh apk        → signed APK only
#   bash scripts/build-mobile.sh debug      → installable debug APK
#
# What it does
#   1. rebuilds Capacitor's webDir (out/) from scripts/web/fallback.html
#   2. npx cap sync android  (copies web assets + plugin config)
#   3. ./gradlew bundleRelease / assembleRelease  → SIGNED artefacts
#
# Prerequisites (this is a real native build, unlike the web app):
#   • JDK 21                      → https://adoptium.net
#   • Android SDK, API 36         → Android Studio's SDK manager
#   • (keystore) android/keystore.properties — created by
#     scripts/generate-keystore.sh; without it the release build is UNSIGNED.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-all}"
cd "$ROOT"

BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; DIM=$'\033[2m'; RESET=$'\033[0m'
say() { echo "${BOLD}$*${RESET}"; }
ok()  { echo "${GREEN}✓ $*${RESET}"; }
bad() { echo "${RED}✗ $*${RESET}"; }
die() { bad "$*"; exit 1; }

echo "🔥 ${BOLD}Prayer Fire Movement — Android build${RESET} (mode: $MODE)"
echo ""

# ── 0. Preflight ────────────────────────────────────────────────────────────
MISSING=()
command -v java >/dev/null    || MISSING+=("JDK 21 (https://adoptium.net)")
command -v gradle >/dev/null  || true   # the wrapper downloads Gradle itself
[ -n "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ] || MISSING+=("Android SDK (set ANDROID_HOME, or install Android Studio)")
if [ ${#MISSING[@]} -gt 0 ]; then
  bad "Missing native build requirements:"
  for m in "${MISSING[@]}"; do echo "    • $m"; done
  echo ""
  say "No problem — you don't need any of this locally."
  echo "  Push to GitHub and the workflow in"
  echo "  ${DIM}.github/workflows/android-release.yml${RESET} builds the signed AAB for you."
  exit 1
fi

if [ ! -f "$ROOT/android/keystore.properties" ]; then
  echo "${DIM}ℹ  android/keystore.properties not found → release build will be UNSIGNED.${RESET}"
  echo "   Create one with: ${DIM}bash scripts/generate-keystore.sh${RESET}"
  echo ""
fi

# ── 1. Web assets ───────────────────────────────────────────────────────────
say "1/3  Preparing Capacitor webDir…"
bash "$ROOT/scripts/prepare-android-webdir.sh"

# ── 2. Sync the native project ──────────────────────────────────────────────
say "2/3  Syncing Capacitor plugins & web assets…"
npx cap sync android

# ── 3. Gradle build ─────────────────────────────────────────────────────────
say "3/3  Building with Gradle…"
cd "$ROOT/android"
chmod +x ./gradlew

case "$MODE" in
  aab|all)
    ./gradlew clean bundleRelease
    AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
    [ -f "$AAB" ] && ok "AAB  → $AAB" || die "AAB was not produced"
    ;;
esac
case "$MODE" in
  apk|all)
    ./gradlew assembleRelease
    APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
    [ -f "$APK" ] && ok "APK  → $APK" || die "APK was not produced"
    ;;
esac
case "$MODE" in
  debug)
    ./gradlew assembleDebug
    APK="$ROOT/android/app/build/outputs/apk/debug/app-debug.apk"
    [ -f "$APK" ] && ok "Debug APK → $APK" || die "debug APK was not produced"
    ;;
esac

# Signature check, when the Android build-tools are on PATH.
if [ -n "${ANDROID_HOME:-}" ] && [ -x "${ANDROID_HOME}/build-tools"/*/*/apksigner ] 2>/dev/null; then
  APKSIGNER="$(echo "${ANDROID_HOME}"/build-tools/*/apksigner | tail -1)"
  if [ -n "${APK:-}" ] && [ -f "$APK" ]; then
    echo ""
    say "Verifying signature…"
    "$APKSIGNER" verify --print-certs "$APK" | head -6 || true
  fi
fi

echo ""
ok "Done."
echo ""
echo "Play Store upload → ${BOLD}app-release.aab${RESET}   (Production / Testing tracks)"
echo "Manual install    → ${BOLD}app-release.apk${RESET}   (share the file, or 'adb install')"
echo ""
echo "Before your first upload, read: ${DIM}docs/PLAYSTORE-RELEASE.md${RESET}"
