#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Materialise Capacitor's webDir (out/) from the version-controlled fallback.
#
# The production shell loads https://prayer-fire.vercel.app directly
# (capacitor.config.ts → server.url), so the bundled web assets are only an
# offline fallback. `out/` is gitignored, which is why it is rebuilt here
# instead of being committed.
#
# Usage: bash scripts/prepare-android-webdir.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/scripts/web/fallback.html"
DEST_DIR="$ROOT/out"
DEST="$DEST_DIR/index.html"

mkdir -p "$DEST_DIR"
cp "$SRC" "$DEST"
echo "✅ webDir ready: $DEST"
echo "   (offline fallback only — the live site is loaded from server.url)"
