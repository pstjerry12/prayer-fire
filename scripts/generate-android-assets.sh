#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Prayer Fire Movement — Android asset generator
#
# Regenerates EVERY branded asset in android/app/src/main/res from the single
# source of truth, public/logo.png:
#
#   • mipmap-*/ic_launcher.png            (legacy square icon, rounded corners)
#   • mipmap-*/ic_launcher_round.png      (legacy circular icon)
#   • mipmap-*/ic_launcher_foreground.png (adaptive icon foreground, safe zone)
#   • drawable-*/ic_stat_icon_config_sample.png (white status-bar notification
#                                                glyph — the name capacitor.config.ts asks for)
#   • drawable-{port,land}-*/splash.png   (branded splash screens)
#   • raw/beep.wav                        (alarm/notification sound)
#
# Usage:  bash scripts/generate-android-assets.sh
# Needs:  ImageMagick (convert/identify) + Python 3 (for the WAV only)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/public/logo.png"
RES="$ROOT/android/app/src/main/res"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Brand palette (matches the web app's fire theme).
BG_DARK='#2A0A0A'          # launcher / adaptive icon background
SPLASH_IN='#4A1010'        # splash radial gradient centre
SPLASH_OUT='#120404'       # splash radial gradient edge

command -v convert >/dev/null || { echo "✗ ImageMagick 'convert' not found"; exit 1; }

[ -f "$SRC" ] || { echo "✗ $SRC not found"; exit 1; }
mkdir -p "$RES"

echo "🔥 Generating Prayer Fire Movement Android assets from $SRC"

# ── 1. Cut the flame out of its white background ────────────────────────────
# The logo is a fully opaque square with a near-white backdrop. Flood-fill from
# the four corners (NOT -transparent white) so white highlights *inside* the
# flame survive and only the connected backdrop is removed.
convert "$SRC" -resize 1024x1024 \
  -fuzz 14% -fill none \
  -draw 'color 1,1 floodfill' \
  -draw 'color 1022,1 floodfill' \
  -draw 'color 1,1022 floodfill' \
  -draw 'color 1022,1022 floodfill' \
  -background none -trim +repage "$TMP/cut.png"

# Normalise onto a transparent square canvas.
side=$(identify -format '%[fx:max(w,h)]' "$TMP/cut.png" | cut -d. -f1)
convert "$TMP/cut.png" -gravity center -background none \
  -extent "${side}x${side}" "$TMP/flame.png"
echo "   flame cut-out: ${side}x${side} (transparent)"

# ── 2. Launcher icons ───────────────────────────────────────────────────────
gen_launcher () { # $1 = density dir, $2 = px
  local dir="$RES/mipmap-$1" s="$2"
  mkdir -p "$dir"
  # Square artwork: brand background + flame at 68%.
  convert -size "${s}x${s}" "xc:${BG_DARK}" \
    \( "$TMP/flame.png" -resize "$((s * 68 / 100))x$((s * 68 / 100))" \) \
    -gravity center -composite "$TMP/art.png"
  # Rounded-rect mask (squircle-ish radius ≈ 20%).
  convert "$TMP/art.png" \
    \( -size "${s}x${s}" xc:none \
       -draw "roundrectangle 0,0,$((s-1)),$((s-1)),$((s/5)),$((s/5))" \) \
    -alpha set -compose DstIn -composite "$dir/ic_launcher.png"
  # Circular mask for the round icon.
  convert "$TMP/art.png" \
    \( -size "${s}x${s}" xc:none \
       -draw "circle $((s/2)),$((s/2)) $((s/2)),0" \) \
    -alpha set -compose DstIn -composite "$dir/ic_launcher_round.png"
}

# Adaptive icon foreground: the visible safe zone is the inner 66/108 (~61%),
# so the glyph is drawn at 55% to never get clipped by the launcher mask.
gen_foreground () { # $1 = density dir, $2 = px
  local dir="$RES/mipmap-$1" s="$2"
  mkdir -p "$dir"
  convert -size "${s}x${s}" xc:none \
    \( "$TMP/flame.png" -resize "$((s * 55 / 100))x$((s * 55 / 100))" \) \
    -gravity center -composite "$dir/ic_launcher_foreground.png"
}

echo "   launcher icons…"
gen_launcher   mdpi     48
gen_launcher   hdpi     72
gen_launcher   xhdpi    96
gen_launcher   xxhdpi  144
gen_launcher   xxxhdpi  192
gen_foreground mdpi    108
gen_foreground hdpi    162
gen_foreground xhdpi   216
gen_foreground xxhdpi  324
gen_foreground xxxhdpi 432

# ── 3. Status-bar / notification glyph (alpha-only white) ───────────────────
# capacitor.config.ts → LocalNotifications.smallIcon: 'ic_stat_icon_config_sample'
echo "   notification glyph…"
gen_notif () { # $1 = density dir, $2 = px
  local dir="$RES/drawable-$1" s="$2"
  mkdir -p "$dir"
  convert "$TMP/flame.png" -resize "${s}x${s}" -alpha extract "$TMP/mask.png"
  convert -size "${s}x${s}" xc:white "$TMP/mask.png" \
    -alpha off -compose CopyOpacity -composite "$dir/ic_stat_icon_config_sample.png"
}
gen_notif mdpi 24
gen_notif hdpi 36
gen_notif xhdpi 48
gen_notif xxhdpi 72
gen_notif xxxhdpi 96

# ── 4. Splash screens (portrait + landscape, all densities) ─────────────────
echo "   splash screens…"
gen_splash () { # $1 = dir name, $2 = WxH, $3 = flame px
  local dir="$RES/$1"
  mkdir -p "$dir"
  convert -size "$2" "radial-gradient:${SPLASH_IN}-${SPLASH_OUT}" \
    \( "$TMP/flame.png" -resize "${3}x${3}" \) \
    -gravity center -composite "$dir/splash.png"
}
gen_splash drawable-port-mdpi     320x480   110
gen_splash drawable-port-hdpi     480x800   165
gen_splash drawable-port-xhdpi    720x1280  250
gen_splash drawable-port-xxhdpi  1080x1920  375
gen_splash drawable-port-xxxhdpi 1440x2560 500
gen_splash drawable-land-mdpi     480x320   110
gen_splash drawable-land-hdpi     800x480   165
gen_splash drawable-land-xhdpi   1280x720   250
gen_splash drawable-land-xxhdpi  1920x1080 375
gen_splash drawable-land-xxxhdpi 2560x1440 500
# The base drawable is used by Theme.SplashScreen on densities without a match.
gen_splash drawable               720x1280  250

# ── 5. Alarm / notification sound ───────────────────────────────────────────
echo "   beep.wav…"
mkdir -p "$RES/raw"
python3 - "$RES/raw/beep.wav" <<'PY'
import math, struct, sys, wave

path, rate = sys.argv[1], 44100
# Rising three-note "call to prayer" chime (A5 → C#6 → E6), bell-like decay.
notes = [(880.0, 0.00, 0.45), (1108.73, 0.28, 0.42), (1318.51, 0.56, 0.80)]
length = 1.5
frames = []
for i in range(int(rate * length)):
    t = i / rate
    sample = 0.0
    for freq, start, dur in notes:
        if start <= t < start + dur:
            dt = t - start
            env = math.exp(-dt * 4.2) * min(1.0, dt * 220)
            sample += 0.34 * env * (
                math.sin(2 * math.pi * freq * dt)
                + 0.36 * math.sin(2 * math.pi * freq * 2 * dt)
                + 0.15 * math.sin(2 * math.pi * freq * 3 * dt)
            )
    # gentle fade-out so the file never ends on a click
    fade = min(1.0, (length - t) / 0.12)
    frames.append(int(max(-1.0, min(1.0, sample * fade)) * 32767))

with wave.open(path, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(rate)
    w.writeframes(struct.pack("<%dh" % len(frames), *frames))
PY

# ── 6. Adaptive-icon background colour + drop Capacitor's placeholder art ───
cat > "$RES/values/ic_launcher_background.xml" <<EOF
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${BG_DARK}</color>
</resources>
EOF
rm -f "$RES/drawable-v24/ic_launcher_foreground.xml" \
      "$RES/drawable/ic_launcher_background.xml"
rmdir "$RES/drawable-v24" 2>/dev/null || true

echo "✅ Android assets generated in $RES"
echo "   Re-run after changing public/logo.png."
