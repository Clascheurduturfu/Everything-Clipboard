"""Explicit, checksum-verified updates from Stable or Preview GitHub releases.

The branch-manifest transport remains available for isolated legacy fixtures.
Published packages and their manifest live on releases, outside tracked source.
"""

from __future__ import annotations

import hashlib
import json
import os
import platform
import re
import shutil
import ssl
import subprocess
import sys
import urllib.request
import zipfile

import certifi

REPO = "Clascheurduturfu/Everything-Clipboard"
MANIFEST_PATH = "desktop-client/build-output/latest.json"
CHANNELS = ("main", "preview")
# Overridable so the full download/install path can be tested locally.
UPDATE_BASE = os.environ.get("CLIPSYNC_UPDATE_BASE", f"https://raw.githubusercontent.com/{REPO}")
RELEASE_API = f"https://api.github.com/repos/{REPO}/releases?per_page=100"
MAX_PACKAGE_BYTES = 400 * 1024 * 1024
UPDATE_DIR = os.path.join(os.path.expanduser("~/.clipsync"), "update")

_IS_WINDOWS = platform.system() == "Windows"
_IS_MACOS = platform.system() == "Darwin"


class UpdateError(Exception):
    pass


def _https_context() -> ssl.SSLContext:
    """Keep OS trust and add packaged Mozilla roots for standalone Python builds."""
    context = ssl.create_default_context()
    context.load_verify_locations(cafile=certifi.where())
    return context


def _open_url(request, timeout):
    return urllib.request.urlopen(request, timeout=timeout, context=_https_context())


def parse_version(text: str) -> tuple:
    """'2.0 beta 2' -> (2, 0, 0, 0, 2). Betas < release candidates < releases."""
    match = re.match(r"\s*(\d+)(?:\.(\d+))?(?:\.(\d+))?(?:[\s-]*(beta|rc)[\s.-]*(\d+))?\s*$", text or "", re.I)
    if not match:
        return (0,)
    major, minor, patch = (int(part or 0) for part in match.groups()[:3])
    phase = (match.group(4) or "").lower()
    # The mistakenly labeled 2.0.1-beta.2 hotfix belongs just before the 2.0
    # RC line. Keep beta.1's normal ordering and normalize only beta.2+ here.
    if phase == "beta" and patch == 1 and int(match.group(5) or 0) >= 2:
        patch = 0
        phase = "rc"
    stage = {"beta": 0, "rc": 1}.get(phase, 2)
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
    if UPDATE_BASE == f"https://raw.githubusercontent.com/{REPO}":
        return _release_check(current_version, channel, key, timeout)
    try:
        with _open_url(_url(channel, MANIFEST_PATH), timeout) as response:
            manifest = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise UpdateError(f"Could not check for updates: {exc}") from exc
    entry = manifest.get(key)
    if not entry or parse_version(entry.get("version", "")) <= parse_version(current_version):
        return None
    return {**entry, "channel": channel, "url": _url(channel, entry["path"])}


def _release_check(current_version: str, channel: str, key: str, timeout: float) -> dict | None:
    def read(url, limit):
        request = urllib.request.Request(url, headers={"User-Agent": "ClipSync-Updater", "Accept": "application/vnd.github+json" if url == RELEASE_API else "application/octet-stream"})
        with _open_url(request, timeout) as response:
            data = response.read(limit + 1)
        if len(data) > limit:
            raise UpdateError("Update metadata is too large")
        return data

    def release_asset(assets, name):
        found = [asset for asset in assets if asset.get("name") == name]
        if len(found) != 1:
            raise UpdateError(f"Release is missing a unique {name} asset")
        asset = found[0]
        url = asset.get("browser_download_url", "")
        if not url.startswith(f"https://github.com/{REPO}/releases/download/"):
            raise UpdateError("Unexpected update download location")
        digest = asset.get("digest", "")
        if not re.fullmatch(r"sha256:[a-fA-F0-9]{64}", digest):
            raise UpdateError("Release has no verified SHA-256 digest")
        if not 0 < asset.get("size", 0) <= MAX_PACKAGE_BYTES:
            raise UpdateError("Invalid update package size")
        return asset, url, digest[7:].lower()

    try:
        releases = json.loads(read(RELEASE_API, 2 * 1024 * 1024))
        candidates = [release for release in releases if not release.get("draft")
                      and bool(release.get("prerelease")) == (channel == "preview")
                      and parse_version(release.get("tag_name", "").removeprefix("v")) != (0,)]
        candidates.sort(key=lambda release: parse_version(release["tag_name"].removeprefix("v")), reverse=True)
        newest_missing_platform = None
        for release in candidates:
            assets = release.get("assets", [])
            # Older stable releases did not carry the update manifest.
            if not any(asset.get("name") == "latest.json" for asset in assets):
                continue
            _, manifest_url, manifest_digest = release_asset(assets, "latest.json")
            raw = read(manifest_url, 64 * 1024)
            if hashlib.sha256(raw).hexdigest() != manifest_digest:
                raise UpdateError("Update manifest checksum mismatch")
            entry = json.loads(raw).get(key)
            if not entry:
                release_version = release["tag_name"].removeprefix("v")
                if parse_version(release_version) > parse_version(current_version):
                    newest_missing_platform = release_version
                continue
            if parse_version(entry.get("version", "")) <= parse_version(current_version):
                continue
            name = {"windows": "ClipSync.zip", "macos": "ClipSync.dmg"}[key]
            asset, url, digest = release_asset(assets, name)
            if entry.get("sha256") != digest or entry.get("size") != asset["size"]:
                raise UpdateError("Release package does not match its manifest")
            return {"version": entry["version"], "path": name, "url": url, "sha256": digest,
                    "size": asset["size"], "asset_id": asset["id"], "release_id": release["id"], "channel": channel}
        if newest_missing_platform:
            platform_name = {"windows": "Windows", "macos": "macOS"}[key]
            channel_name = "Preview" if channel == "preview" else "Stable"
            raise UpdateError(f"{platform_name} package is not available for {channel_name} {newest_missing_platform} yet.")
        return None
    except UpdateError:
        raise
    except Exception as exc:
        raise UpdateError(f"Could not check GitHub releases: {exc}") from exc


def download(update: dict, timeout: float = 60) -> str:
    """Download the package and verify its SHA-256. Returns the local path."""
    os.makedirs(UPDATE_DIR, exist_ok=True)
    target = os.path.join(UPDATE_DIR, os.path.basename(update["path"]))
    digest = hashlib.sha256()
    received = 0
    try:
        with _open_url(update["url"], timeout) as response, open(target, "wb") as out:
            while True:
                chunk = response.read(256 * 1024)
                if not chunk:
                    break
                received += len(chunk)
                if received > min(update.get("size", MAX_PACKAGE_BYTES), MAX_PACKAGE_BYTES):
                    raise UpdateError("Downloaded package exceeds its expected size")
                digest.update(chunk)
                out.write(chunk)
    except Exception as exc:
        if os.path.exists(target):
            os.remove(target)
        raise UpdateError(f"Download failed: {exc}") from exc
    if digest.hexdigest() != update.get("sha256") or received != update.get("size", received):
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
    _validate_windows_package(package)
    stage = os.path.join(UPDATE_DIR, "stage")
    update_root = os.path.abspath(UPDATE_DIR)
    if os.path.commonpath([update_root, os.path.abspath(stage)]) != update_root or os.path.abspath(stage) == update_root:
        raise UpdateError("Unsafe update staging directory")
    shutil.rmtree(stage, ignore_errors=True)
    with zipfile.ZipFile(package) as archive:
        archive.extractall(stage)
    new_root = stage
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


def _validate_windows_package(package: str) -> None:
    try:
        with zipfile.ZipFile(package) as archive:
            expanded = 0
            for info in archive.infolist():
                parts = info.filename.replace("\\", "/").split("/")
                if not parts or any(part in ("..", ".") or ":" in part for part in parts):
                    raise UpdateError("Unsafe path in update ZIP")
                if ((info.external_attr >> 16) & 0o170000) == 0o120000:
                    raise UpdateError("Unexpected link in Windows update ZIP")
                expanded += info.file_size
                if expanded > 1024 * 1024 * 1024:
                    raise UpdateError("Expanded update ZIP is too large")
            if "ClipSync.exe" not in archive.namelist():
                raise UpdateError("Update package does not contain ClipSync.exe")
    except zipfile.BadZipFile as exc:
        raise UpdateError("Invalid update ZIP") from exc


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
