#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Prayer Fire Movement — Google Play Store listing assets
#
# Play Console will not let you publish without these, so generate them from
# the same brand source (public/logo.png) as the app icons:
#
#   • store-assets/app-icon-512.png            512×512   32-bit PNG, full bleed
#   • store-assets/feature-graphic-1024x500.png 1024×500 required for the listing
#   • store-assets/screenshot-template-1080x1920.png  drop a real screenshot in
#
# Usage: bash scripts/generate-store-assets.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/public/logo.png"
OUT="$ROOT/store-assets"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

command -v convert >/dev/null || { echo "✗ ImageMagick 'convert' not found"; exit 1; }
mkdir -p "$OUT"

BOLD='DejaVu-Sans-Bold'
REG='DejaVu-Sans'
BG_IN='#4A1010'; BG_OUT='#120404'
CORAL='#F0B49B'

# Transparent flame, exactly like the Android asset generator.
convert "$SRC" -resize 1024x1024 -fuzz 14% -fill none \
  -draw 'color 1,1 floodfill' -draw 'color 1022,1 floodfill' \
  -draw 'color 1,1022 floodfill' -draw 'color 1022,1022 floodfill' \
  -background none -trim +repage "$TMP/cut.png"
side=$(identify -format '%[fx:max(w,h)]' "$TMP/cut.png" | cut -d. -f1)
convert "$TMP/cut.png" -gravity center -background none -extent "${side}x${side}" "$TMP/flame.png"

echo "🔥 Generating Play Store listing assets"

# ── 1. App icon (512×512, full bleed — Play applies its own corner mask) ────
convert -size 512x512 "xc:#2A0A0A" \
  \( "$TMP/flame.png" -resize 344x344 \) \
  -gravity center -composite "$OUT/app-icon-512.png"
echo "   ✓ app-icon-512.png"

# ── 2. Feature graphic (1024×500) ────────────────────────────────────────────
convert -size 1024x500 "radial-gradient:${BG_IN}-${BG_OUT}" \
  \( "$TMP/flame.png" -resize 300x300 \) -geometry +78+100 -composite \
  -font "$BOLD" -pointsize 58 -fill '#FFFFFF' \
  -annotate +430+195 'PRAYER FIRE' \
  -font "$BOLD" -pointsize 58 -fill '#FFFFFF' \
  -annotate +430+262 'MOVEMENT' \
  -font "$REG" -pointsize 27 -fill "$CORAL" \
  -annotate +430+330 'Pray 3x a day — a cure for prayerlessness' \
  -font "$REG" -pointsize 22 -fill '#B98A8A' \
  -annotate +430+382 'Alarms · Bible · Prayer groups · Fasting' \
  "$OUT/feature-graphic-1024x500.png"
echo "   ✓ feature-graphic-1024x500.png"

# ── 3. Screenshot template (1080×1920) ───────────────────────────────────────
convert -size 1080x1920 "radial-gradient:${BG_IN}-${BG_OUT}" \
  -font "$BOLD" -pointsize 54 -fill '#FFFFFF' \
  -annotate +70+150 'Prayer Fire Movement' \
  -font "$REG" -pointsize 32 -fill "$CORAL" \
  -annotate +70+215 'Replace this area with a real screenshot' \
  -font "$REG" -pointsize 30 -fill '#B98A8A' \
  -annotate +70+265 'adb exec-out screencap -p > screen.png' \
  \( -size 940x1500 xc:none -stroke '#7A3B3B' -strokewidth 6 -fill none \
     -draw "rectangle 20,20,919,1479" \) \
  -geometry +70+340 -composite \
  "$OUT/screenshot-template-1080x1920.png"
echo "   ✓ screenshot-template-1080x1920.png"


# ── 4. Normalise to 8-bit/channel PNG (Play Console rejects 16-bit files) ───
for f in "$OUT"/*.png; do
  convert "$f" -depth 8 "$TMP/n.png" && mv "$TMP/n.png" "$f"
done
echo "   ✓ all PNGs re-encoded at 8-bit/channel"

echo ""
echo "✅ Assets written to $OUT"
echo "   Upload app-icon-512.png and feature-graphic-1024x500.png straight to"
echo "   Play Console → Grow → Store presence → Main store listing."
echo "   Screenshots must be REAL app screenshots — see docs/PLAYSTORE-RELEASE.md."
