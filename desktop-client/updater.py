"""In-app updates from the GitHub repository.

Each branch carries ``desktop-client/build-output/latest.json``, written by the
build scripts (see update_manifest.py), describing the package committed for
each platform. ``main`` is the normal channel; ``preview`` is the developer
channel. The app reads that small file now and then and only downloads a
package when the user chooses to install it.

Because the manifest is written next to the package it describes, an app
version bumped without a rebuild can never cause an update loop.
"""

import hashlib
import json
import os
import platform
import re
import shutil
import subprocess
import sys
import urllib.request
import zipfile

REPO = "Clascheurduturfu/Everything-Clipboard"
MANIFEST_PATH = "desktop-client/build-output/latest.json"
CHANNELS = ("main", "preview")
# Overridable so the full download/install path can be tested locally.
UPDATE_BASE = os.environ.get("CLIPSYNC_UPDATE_BASE", f"https://raw.githubusercontent.com/{REPO}")
UPDATE_DIR = os.path.join(os.path.expanduser("~/.clipsync"), "update")

_IS_WINDOWS = platform.system() == "Windows"
_IS_MACOS = platform.system() == "Darwin"


class UpdateError(Exception):
    pass


def parse_version(text: str) -> tuple:
    """'2.0 beta 2' -> (2, 0, 0, 0, 2). Betas < release candidates < releases."""
    match = re.match(r"\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?\s*(?:(beta|rc)\s*(\d+))?\s*$", text or "", re.I)
    if not match:
        return (0,)
    major, minor, patch = (int(part or 0) for part in match.groups()[:3])
    stage = {"beta": 0, "rc": 1}.get((match.group(4) or "").lower(), 2)
    return (major, minor, patch, stage, int(match.group(5) or 0))


def platform_key() -> str | None:
    if _IS_WINDOWS:
        return "windows"
    if _IS_MACOS:
        return "macos"
    return None


def install_root() -> str | None:
    """Folder (Windows) or .app bundle (macOS) of the running packaged app."""
    if not getattr(sys, "frozen", False):
        return None
    exe = os.path.abspath(sys.executable)
    if _IS_WINDOWS:
        root = os.path.dirname(exe)
        return root if os.path.isdir(os.path.join(root, "_internal")) else None
    if _IS_MACOS:
        bundle = os.path.dirname(os.path.dirname(os.path.dirname(exe)))
        return bundle if bundle.endswith(".app") else None
    return None


def _url(channel: str, path: str) -> str:
    return f"{UPDATE_BASE}/{channel}/{path}"


def check(current_version: str, channel: str = "main", timeout: float = 10) -> dict | None:
    """Return the newer package for this platform on *channel*, or None."""
    key = platform_key()
    if key is None or channel not in CHANNELS:
        return None
    try:
        with urllib.request.urlopen(_url(channel, MANIFEST_PATH), timeout=timeout) as response:
            manifest = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise UpdateError(f"Could not check for updates: {exc}") from exc
    entry = manifest.get(key)
    if not entry or parse_version(entry.get("version", "")) <= parse_version(current_version):
        return None
    return {**entry, "channel": channel, "url": _url(channel, entry["path"])}


def download(update: dict, timeout: float = 60) -> str:
    """Download the package and verify its SHA-256. Returns the local path."""
    os.makedirs(UPDATE_DIR, exist_ok=True)
    target = os.path.join(UPDATE_DIR, os.path.basename(update["path"]))
    digest = hashlib.sha256()
    try:
        with urllib.request.urlopen(update["url"], timeout=timeout) as response, open(target, "wb") as out:
            while True:
                chunk = response.read(256 * 1024)
                if not chunk:
                    break
                digest.update(chunk)
                out.write(chunk)
    except Exception as exc:
        raise UpdateError(f"Download failed: {exc}") from exc
    if digest.hexdigest() != update.get("sha256"):
        os.remove(target)
        raise UpdateError("Downloaded update is damaged (checksum mismatch)")
    return target


def apply(package: str, app_root: str, pid: int) -> None:
    """Start a detached helper that waits for *pid* to exit, swaps the app in
    place, and relaunches it. The caller must quit right after this returns."""
    if _IS_WINDOWS:
        _apply_windows(package, app_root, pid)
    elif _IS_MACOS:
        _apply_macos(package, app_root, pid)
    else:
        raise UpdateError("Updates are not supported on this system")


def _apply_windows(package: str, app_root: str, pid: int) -> None:
    stage = os.path.join(UPDATE_DIR, "stage")
    shutil.rmtree(stage, ignore_errors=True)
    with zipfile.ZipFile(package) as archive:
        archive.extractall(stage)
    new_root = os.path.join(stage, "ClipSync")
    if not os.path.isfile(os.path.join(new_root, "ClipSync.exe")):
        raise UpdateError("Update package does not contain ClipSync.exe")

    # The old _internal is kept until the new copy is complete, so a failed
    # copy rolls back instead of leaving a broken install.
    script = os.path.join(UPDATE_DIR, "apply-update.cmd")
    with open(script, "w", encoding="utf-8") as f:
        f.write(f"""@echo off
chcp 65001 >nul
:wait
tasklist /FI "PID eq {pid}" 2>nul | find "{pid}" >nul && (ping -n 2 127.0.0.1 >nul & goto wait)
if exist "{app_root}\\_internal.old" rmdir /s /q "{app_root}\\_internal.old"
move "{app_root}\\_internal" "{app_root}\\_internal.old" >nul
robocopy "{new_root}" "{app_root}" /E /R:3 /W:1 /NFL /NDL /NJH /NJS /NP >nul
if not exist "{app_root}\\ClipSync.exe" goto restore
if not exist "{app_root}\\_internal" goto restore
rmdir /s /q "{app_root}\\_internal.old"
goto launch
:restore
if exist "{app_root}\\_internal" rmdir /s /q "{app_root}\\_internal"
move "{app_root}\\_internal.old" "{app_root}\\_internal" >nul
:launch
start "" "{app_root}\\ClipSync.exe"
rmdir /s /q "{stage}"
del "{package}"
""")
    subprocess.Popen(
        ["cmd", "/c", script],
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        close_fds=True,
    )


def _apply_macos(package: str, app_root: str, pid: int) -> None:
    if not os.access(os.path.dirname(app_root), os.W_OK):
        raise UpdateError(f"No permission to replace {app_root}")
    script = os.path.join(UPDATE_DIR, "apply-update.sh")
    with open(script, "w", encoding="utf-8") as f:
        f.write(f"""#!/bin/sh
while kill -0 {pid} 2>/dev/null; do sleep 0.5; done
MNT=$(mktemp -d /tmp/clipsync-update.XXXXXX)
if hdiutil attach -nobrowse -readonly -mountpoint "$MNT" "{package}" >/dev/null; then
  if [ -d "$MNT/ClipSync.app" ]; then
    rm -rf "{app_root}.old"
    if mv "{app_root}" "{app_root}.old" && ditto "$MNT/ClipSync.app" "{app_root}"; then
      rm -rf "{app_root}.old"
    else
      rm -rf "{app_root}"
      mv "{app_root}.old" "{app_root}"
    fi
  fi
  hdiutil detach "$MNT" -quiet
fi
rmdir "$MNT" 2>/dev/null
rm -f "{package}"
open "{app_root}"
""")
    subprocess.Popen(
        ["/bin/sh", script],
        start_new_session=True,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
