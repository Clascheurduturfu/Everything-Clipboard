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
if command -v create-dmg >/dev/null 2>&1; then
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
else
  # Plain DMG (app + Applications link) with the built-in tools only.
  STAGE="$(mktemp -d)"
  ditto "build-output/macos/ClipSync.app" "$STAGE/ClipSync.app"
  ln -s /Applications "$STAGE/Applications"
  hdiutil create -volname "ClipSync" -srcfolder "$STAGE" -ov -format UDZO -fs HFS+ "$DMG_PATH" >/dev/null
  rm -rf "$STAGE"
fi

# Tell the in-app updater about this package (commit latest.json with it).
python3 update_manifest.py macos "$DMG_PATH"

echo "DMG created at $DMG_PATH"
