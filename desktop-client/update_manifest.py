"""Record a freshly built package in build-output/latest.json.

The in-app updater (updater.py) reads this file from the main or preview
branch, so commit it together with the package it describes.

Usage:  python update_manifest.py windows build-output/windows/ClipSync.zip
        python3 update_manifest.py macos build-output/macos/ClipSync.dmg
"""

import hashlib
import json
import os
import re
import sys

here = os.path.dirname(os.path.abspath(__file__))
platform_key, package = sys.argv[1], os.path.abspath(sys.argv[2])

with open(os.path.join(here, "app.py"), encoding="utf-8") as f:
    version = re.search(r'^APP_VERSION = "(.+)"', f.read(), re.MULTILINE).group(1)

digest = hashlib.sha256()
with open(package, "rb") as f:
    for chunk in iter(lambda: f.read(1024 * 1024), b""):
        digest.update(chunk)

manifest_path = os.path.join(here, "build-output", "latest.json")
manifest = {}
if os.path.exists(manifest_path):
    with open(manifest_path, encoding="utf-8") as f:
        manifest = json.load(f)

manifest[platform_key] = {
    "version": version,
    "path": "desktop-client/" + os.path.relpath(package, here).replace("\\", "/"),
    "sha256": digest.hexdigest(),
    "size": os.path.getsize(package),
}
with open(manifest_path, "w", encoding="utf-8", newline="\n") as f:
    json.dump(manifest, f, indent=2, sort_keys=True)
    f.write("\n")
print(f"latest.json: {platform_key} {version} ({manifest[platform_key]['size']} bytes)")
