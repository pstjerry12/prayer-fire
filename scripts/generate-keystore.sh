#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Prayer Fire Movement — create / rotate the Play Store upload signing key.
#
# Generates a PKCS12 keystore without needing a JDK: a 2048-bit RSA key and a
# 30-year self-signed certificate are produced with OpenSSL and packed into
# PKCS12 (the exact format modern `keytool` emits, so Android Gradle reads it
# natively with storeType=pkcs12).
#
#   bash scripts/generate-keystore.sh
#
# Output (all gitignored):
#   android/keystore/prayer-fire-upload.keystore
#   android/keystore.properties
#
# Keep BOTH files somewhere safe outside git (password manager, encrypted
# drive, and the CI secrets). Google Play App Signing holds the real app
# signing key, so if you ever lose this one you can reset the upload key in
# Play Console → Setup → App signing.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY_DIR="$ROOT/android/keystore"
KEYSTORE="$KEY_DIR/prayer-fire-upload.keystore"
PROPS="$ROOT/android/keystore.properties"
ALIAS="prayerfire-upload"
VALIDITY_DAYS=10950   # 30 years

command -v openssl >/dev/null || { echo "✗ openssl not found"; exit 1; }

if [ -f "$KEYSTORE" ]; then
  echo "⚠  $KEYSTORE already exists."
  read -r -p "   Overwrite with a NEW key? (y/N) " confirm
  case "$confirm" in
    y|Y) ;;
    *) echo "   Aborted — existing key kept."; exit 0 ;;
  esac
fi

mkdir -p "$KEY_DIR"
PASS="$(openssl rand -hex 16)"

TMP_KEY="$(mktemp)"; TMP_CRT="$(mktemp)"
trap 'rm -f "$TMP_KEY" "$TMP_CRT"' EXIT

openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days "$VALIDITY_DAYS" \
  -keyout "$TMP_KEY" -out "$TMP_CRT" \
  -subj "/CN=Prayer Fire Movement/OU=Mobile Apps/O=Prayer Fire Movement/L=Lagos/ST=Lagos/C=NG" 2>/dev/null

openssl pkcs12 -export -name "$ALIAS" \
  -inkey "$TMP_KEY" -in "$TMP_CRT" -out "$KEYSTORE" \
  -passout "pass:$PASS" -keypbe AES-256-CBC -certpbe AES-256-CBC -macalg sha256 2>/dev/null

cat > "$PROPS" <<EOF
# Upload-key signing config for Prayer Fire Movement.
# NEVER commit this file or the .keystore to git (both are gitignored).
# If you lose the key, Google Play App Signing lets you reset the upload key:
#   Play Console → Setup → App signing → "Reset upload key"
storeFile=keystore/prayer-fire-upload.keystore
storeType=pkcs12
storePassword=$PASS
keyAlias=$ALIAS
keyPassword=$PASS
EOF
chmod 600 "$KEYSTORE" "$PROPS"

echo ""
echo "✅ Upload key created"
echo "   keystore : $KEYSTORE"
echo "   config   : $PROPS"
echo "   alias    : $ALIAS"
echo "   validity : $VALIDITY_DAYS days (30 years)"
echo ""
echo "── Certificate fingerprints ──────────────────────────────────────────────"
echo "SHA-1:"
openssl pkcs12 -in "$KEYSTORE" -passin "pass:$PASS" -nokeys -clcerts 2>/dev/null \
  | openssl x509 -noout -fingerprint -sha1 | sed 's/^/  /'
echo "SHA-256:"
openssl pkcs12 -in "$KEYSTORE" -passin "pass:$PASS" -nokeys -clcerts 2>/dev/null \
  | openssl x509 -noout -fingerprint -sha256 | sed 's/^/  /'
echo "──────────────────────────────────────────────────────────────────────────"
echo "STORE THIS PASSWORD NOW (also in $PROPS):"
echo "  $PASS"
echo ""
echo "Next: run 'bash scripts/build-mobile.sh android' to produce a signed AAB."
