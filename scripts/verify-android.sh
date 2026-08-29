#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Prayer Fire Movement — Android pre-flight check
#
# Catches the mistakes that normally only surface 4 minutes into a Gradle build,
# without needing a JDK:
#   1. every @type/name resource reference in the manifest + res/ resolves
#   2. the assets capacitor.config.ts asks for actually exist
#      (smallIcon 'ic_stat_icon_config_sample', sound 'beep.wav')
#   3. signing key + properties are present and consistent
#   4. versionCode / targetSdk are Play-Store-safe
#
# Usage: bash scripts/verify-android.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MAIN="$ROOT/android/app/src/main"
FAIL=0

step() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad()  { printf '  \033[31m✗\033[0m %s\n' "$1"; FAIL=1; }

echo "🔥 Prayer Fire Movement — Android pre-flight"

step "1/4  Resource references"
python3 - "$MAIN" <<'PY'
import os, re, glob, sys, collections
main = sys.argv[1]
res = os.path.join(main, "res")

available = collections.defaultdict(set)
for d in os.listdir(res):
    full = os.path.join(res, d)
    if not os.path.isdir(full):
        continue
    if d.startswith("values"):
        for f in glob.glob(os.path.join(full, "*.xml")):
            for m in re.finditer(r'<(color|string|style|drawable|dimen|integer|array|bool)\s+name="([^"]+)"',
                                 open(f, encoding="utf-8", errors="ignore").read()):
                available[m.group(1)].add(m.group(2))
        continue
    for f in os.listdir(full):
        if f != ".npmkeep":
            available[d.split("-")[0]].add(os.path.splitext(f)[0])

refs = set()
for f in [os.path.join(main, "AndroidManifest.xml")] + glob.glob(res + "/**/*.xml", recursive=True):
    for m in re.finditer(r'@(style|drawable|mipmap|layout|color|string|xml|raw|dimen|integer|array|bool|anim)/(\w+)',
                         open(f, encoding="utf-8", errors="ignore").read()):
        refs.add((m.group(1), m.group(2), os.path.relpath(f, main)))

missing = [(t, n, s) for t, n, s in sorted(refs) if n not in available.get(t, set())]
print(f"  index: " + ", ".join(f"{k}={len(v)}" for k, v in sorted(available.items())))
print(f"  {len(refs)} references checked")
if missing:
    for t, n, s in missing:
        print(f"  ✗ @{t}/{n}  (from {s})")
    sys.exit(1)
print("  ✓ all resource references resolve")
PY
[ "$FAIL" -eq 0 ] || true

step "2/4  Assets required by capacitor.config.ts"
for pair in \
  "notification glyph (smallIcon):res/drawable-xhdpi/ic_stat_icon_config_sample.png" \
  "launcher icon:res/mipmap-xxxhdpi/ic_launcher.png" \
  "launcher round icon:res/mipmap-xxxhdpi/ic_launcher_round.png" \
  "adaptive foreground:res/mipmap-xxxhdpi/ic_launcher_foreground.png" \
  "adaptive background colour:res/values/ic_launcher_background.xml" \
  "splash (portrait):res/drawable-port-xxxhdpi/splash.png" \
  "splash (landscape):res/drawable-land-xxxhdpi/splash.png" \
  "alarm sound (sound):res/raw/beep.wav" \
  "bundled offline page:assets/public/index.html"; do
  label="${pair%%:*}"; path="${pair#*:}"
  if [ -f "$MAIN/$path" ]; then ok "$label"; else bad "$label missing → $path"; fi
done

step "3/4  Release signing"
PROPS="$ROOT/android/keystore.properties"
if [ -f "$PROPS" ]; then
  ok "android/keystore.properties found"
  store_file=$(sed -n 's/^storeFile=//p' "$PROPS")
  store_type=$(sed -n 's/^storeType=//p' "$PROPS")
  alias=$(sed -n 's/^keyAlias=//p' "$PROPS")
  if [ -f "$ROOT/android/$store_file" ]; then ok "keystore present → android/$store_file"; else bad "keystore not found → android/$store_file"; fi
  [ -n "$store_type" ] && ok "store type = $store_type" || bad "storeType missing"
  [ -n "$alias" ] && ok "key alias = $alias" || bad "keyAlias missing"
  for k in storePassword keyPassword; do
    sed -n "s/^$k=.*/$k set/p" "$PROPS" | grep -q "set" && ok "$k set" || bad "$k missing"
  done
  if openssl pkcs12 -info -in "$ROOT/android/$store_file" \
       -passin "pass:$(sed -n 's/^storePassword=//p' "$PROPS")" -nokeys -noout >/dev/null 2>&1; then
    ok "keystore opens with the configured password"
  else
    bad "keystore/password mismatch (openssl could not open it)"
  fi
else
  bad "android/keystore.properties missing → run: bash scripts/generate-keystore.sh"
fi

step "4/4  Play Store policy"
VARS="$ROOT/android/variables.gradle"
code=$(sed -n 's/.*appVersionCode = \([0-9]*\).*/\1/p' "$VARS")
name=$(sed -n 's/.*appVersionName = "\(.*\)".*/\1/p' "$VARS")
target=$(sed -n 's/.*targetSdkVersion = \([0-9]*\).*/\1/p' "$VARS")
min=$(sed -n 's/.*minSdkVersion = \([0-9]*\).*/\1/p' "$VARS")
[ -n "$code" ] && [ "$code" -ge 1 ] && ok "versionCode = $code" || bad "appVersionCode not set"
[ -n "$name" ] && ok "versionName = $name" || bad "appVersionName not set"
[ -n "$target" ] && [ "$target" -ge 35 ] && ok "targetSdk = $target (Play requires 35+)" || bad "targetSdkVersion = ${target:-?} — Play needs 35+"
[ -n "$min" ] && ok "minSdk = $min (Android $([ $min -lt 24 ] && echo 'older' || echo '7.0+') )"

if grep -q 'SCHEDULE_EXACT_ALARM' "$MAIN/AndroidManifest.xml"; then
  ok "exact-alarm permission declared"
else
  bad "SCHEDULE_EXACT_ALARM missing — prayer alarms will be inexact on Android 12+"
fi
grep -q 'POST_NOTIFICATIONS' "$MAIN/AndroidManifest.xml" && ok "notification permission declared" \
  || bad "POST_NOTIFICATIONS missing — no notifications on Android 13+"

printf '\n'
if [ "$FAIL" -eq 0 ]; then
  printf '\033[32m✅ Pre-flight passed — ready to build a signed AAB.\033[0m\n'
  printf '   bash scripts/build-mobile.sh   (or run the GitHub Action)\n\n'
else
  printf '\033[31m❌ Pre-flight failed — fix the items above before building.\033[0m\n\n'
  exit 1
fi
