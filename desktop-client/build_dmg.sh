#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -d "build-output/macos/ClipSync.app" ]; then
  echo "Error: ClipSync.app not found. Please run build_macos.sh first."
  exit 1
fi

DMG_PATH="build-output/macos/ClipSync.dmg"
rm -f "$DMG_PATH"

echo "Creating DMG..."
create-dmg \
  --volname "ClipSync" \
  --volicon "assets/clipsync.icns" \
  --window-pos 200 120 \
  --window-size 500 300 \
  --icon-size 128 \
  --icon "ClipSync.app" 130 140 \
  --hide-extension "ClipSync.app" \
  --app-drop-link 370 140 \
  "$DMG_PATH" \
  "build-output/macos/ClipSync.app"

echo "Beautiful DMG created at $DMG_PATH"
