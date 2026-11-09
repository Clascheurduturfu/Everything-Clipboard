#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

PYTHON_BIN="${PYTHON_BIN:-}"
if [ -z "$PYTHON_BIN" ]; then
  if [ -x "/usr/local/bin/python3" ]; then
    PYTHON_BIN="/usr/local/bin/python3"
  else
    PYTHON_BIN="python3"
  fi
fi

"$PYTHON_BIN" -m pip install -r requirements.txt
rm -rf build-output/macos ClipSync.spec

"$PYTHON_BIN" -m PyInstaller \
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
  --collect-data certifi \
  --collect-submodules customtkinter \
  app.py

rm -rf build-output/macos/_pyinstaller

# Start as a menu-bar-only (accessory) app so no Dock icon flashes at launch.
# app.py promotes the process to a regular app at runtime when a window is
# open or when the user turns "Hide Dock icon" off.
APP_BUNDLE="build-output/macos/ClipSync.app"
plutil -replace LSUIElement -bool YES "$APP_BUNDLE/Contents/Info.plist"
APP_VERSION="$("$PYTHON_BIN" -c 'import ast; tree=ast.parse(open("app.py").read()); print(next(n.value.value for n in tree.body if isinstance(n, ast.Assign) and any(isinstance(t, ast.Name) and t.id == "APP_VERSION" for t in n.targets)))')"
CORE_VERSION="${APP_VERSION%%-*}"
BUILD_VERSION="${APP_VERSION##*.}"
plutil -replace CFBundleShortVersionString -string "$CORE_VERSION" "$APP_BUNDLE/Contents/Info.plist"
plutil -replace CFBundleVersion -string "$BUILD_VERSION" "$APP_BUNDLE/Contents/Info.plist"
plutil -replace CFBundleGetInfoString -string "ClipSync $APP_VERSION" "$APP_BUNDLE/Contents/Info.plist"
# Editing Info.plist invalidates PyInstaller's ad-hoc signature; re-sign so
# the bundle still launches on Apple Silicon.
codesign --force --deep --sign - "$APP_BUNDLE"

echo "Built macOS app at build-output/macos/ClipSync.app"
rm -f ClipSync.spec
