#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

python3 -m pip install -r requirements.txt
rm -rf build-output/macos ClipSync.spec

python3 -m PyInstaller \
  --noconfirm \
  --clean \
  --windowed \
  --name ClipSync \
  --workpath build-output/macos/_pyinstaller \
  --distpath build-output/macos \
  --specpath . \
  --osx-bundle-identifier com.clipsync.app \
  --icon assets/clipsync.icns \
  --add-data "assets/clipsync.icns:assets" \
  --collect-data customtkinter \
  app.py

rm -rf build-output/macos/_pyinstaller

# Start as a menu-bar-only (accessory) app so no Dock icon flashes at launch.
# app.py promotes the process to a regular app at runtime when a window is
# open or when the user turns "Hide Dock icon" off.
APP_BUNDLE="build-output/macos/ClipSync.app"
plutil -replace LSUIElement -bool YES "$APP_BUNDLE/Contents/Info.plist"
# Editing Info.plist invalidates PyInstaller's ad-hoc signature; re-sign so
# the bundle still launches on Apple Silicon.
codesign --force --deep --sign - "$APP_BUNDLE"

echo "Built macOS app at build-output/macos/ClipSync.app"
rm -f ClipSync.spec
