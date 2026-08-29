#!/bin/bash
# ──────────────────────────────────────────────
# Prayer Fire Movement — Mobile App Build Script
# ──────────────────────────────────────────────
# Prerequisites:
#   - Node.js + npm
#   - Android Studio (for Android builds)
#   - Xcode (for iOS builds, macOS only)
#   - npx cap installed (already in package.json)
#
# Usage:
#   bash scripts/build-mobile.sh android
#   bash scripts/build-mobile.sh ios
# ──────────────────────────────────────────────

set -e

PLATFORM="${1:-android}"

echo "🔥 Prayer Fire Movement — Mobile Build"
echo "Platform: $PLATFORM"
echo ""

# Step 1: Build the Next.js static export
echo "📦 Building Next.js static export..."
npm run build
npx next export
echo "✅ Static export ready in /out"

# Step 2: Copy web assets to native project
echo "📱 Copying web assets to Capacitor..."
npx cap copy "$PLATFORM"
echo "✅ Assets copied"

# Step 3: Open native IDE
echo "🔧 Opening native project..."
npx cap open "$PLATFORM"
echo ""
echo "✅ Done! Build and run from your native IDE."
echo ""
echo "Android:  Build → Run in Android Studio"
echo "iOS:      Build → Run in Xcode (macOS only)"
