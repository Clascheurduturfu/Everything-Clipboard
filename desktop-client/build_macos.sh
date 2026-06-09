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
  app.py

rm -rf build-output/macos/_pyinstaller

echo "Built macOS app at build-output/macos/ClipSync.app"
rm -f ClipSync.spec
