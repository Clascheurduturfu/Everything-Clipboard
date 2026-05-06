#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

python3 -m pip install -r requirements.txt
python3 -m PyInstaller \
  --noconfirm \
  --clean \
  --windowed \
  --name ClipSync \
  --osx-bundle-identifier com.clipsync.app \
  --icon assets/clipsync.icns \
  --add-data "assets/clipsync.icns:assets" \
  app.py

echo "Built macOS app at dist/ClipSync.app"
