"""Tests for the in-app updater's version logic, manifest check and download.

Run:  python test_updater.py
"""

import functools
import io
import hashlib
import http.server
import json
import os
import shutil
import ssl
import sys
import tempfile
import threading
import unittest
import zipfile
from unittest.mock import patch

sys.path.insert(0, ".")

import updater  # noqa: E402


class TLSContextTest(unittest.TestCase):
    def test_bundle_supplies_roots_without_a_system_certificate_store(self):
        with tempfile.TemporaryDirectory() as folder, patch.dict(os.environ, {
            "SSL_CERT_FILE": os.path.join(folder, "missing.pem"), "SSL_CERT_DIR": folder
        }):
            context = updater._https_context()
        self.assertTrue(context.check_hostname)
        self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)
        self.assertGreater(context.cert_store_stats()["x509_ca"], 0)

    def test_download_uses_verified_context(self):
        payload = b"package fixture"
        with tempfile.TemporaryDirectory() as folder, patch.object(updater, "UPDATE_DIR", folder), \
                patch.object(updater.urllib.request, "urlopen", return_value=io.BytesIO(payload)) as fetch:
            updater.download({"url": "https://example.com/ClipSync.dmg", "path": "ClipSync.dmg",
                              "size": len(payload), "sha256": hashlib.sha256(payload).hexdigest()})
            context = fetch.call_args.kwargs["context"]
            self.assertTrue(context.check_hostname)
            self.assertEqual(context.verify_mode, ssl.CERT_REQUIRED)

    def test_certificate_failure_does_not_retry_without_verification(self):
        with patch.object(updater.urllib.request, "urlopen", side_effect=ssl.SSLCertVerificationError("bad certificate")) as fetch:
            with self.assertRaises(updater.UpdateError):
                updater.check("0.0", "preview")
            self.assertEqual(fetch.call_count, 1)


class VersionTest(unittest.TestCase):
    def test_semver_preview_versions(self):
        self.assertEqual(updater.parse_version("2.0.1-beta.1"), updater.parse_version("2.0.1 beta 1"))
        self.assertEqual(updater.parse_version("2.0-rc.4"), updater.parse_version("2.0 rc 4"))
        self.assertGreater(updater.parse_version("2.0.1-beta.1"), updater.parse_version("2.0"))
        self.assertLess(updater.parse_version("2.0.1-beta.1"), updater.parse_version("2.0.1"))

    def test_ordering(self):
        order = ["1.0.2", "2.0 beta 1", "2.0 beta 2", "2.0 beta 10", "2.0 rc 1", "2.0", "2.0.1", "2.1 beta 1"]
        parsed = [updater.parse_version(v) for v in order]
        self.assertEqual(parsed, sorted(parsed), order)

    def test_garbage_is_oldest(self):
        self.assertLess(updater.parse_version("not a version"), updater.parse_version("0.1"))


class ManifestTest(unittest.TestCase):
    """Serves a fake repository over HTTP: <root>/<branch>/desktop-client/..."""

    def setUp(self):
        self.root = tempfile.mkdtemp()
        self.package = b"pretend this is ClipSync.zip" * 1000
        for branch, version in (("main", "2.0 beta 1"), ("preview", "2.0")):
            folder = os.path.join(self.root, branch, "desktop-client", "build-output")
            os.makedirs(os.path.join(folder, "windows"))
            os.makedirs(os.path.join(folder, "macos"))
            for name in ("windows/ClipSync.zip", "macos/ClipSync.dmg"):
                with open(os.path.join(folder, name), "wb") as f:
                    f.write(self.package)
            entry = {"sha256": hashlib.sha256(self.package).hexdigest(), "size": len(self.package)}
            with open(os.path.join(folder, "latest.json"), "w") as f:
                json.dump({
                    "windows": {**entry, "version": version, "path": "desktop-client/build-output/windows/ClipSync.zip"},
                    "macos": {**entry, "version": version, "path": "desktop-client/build-output/macos/ClipSync.dmg"},
                }, f)
        handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=self.root)
        handler.log_message = lambda *a, **k: None
        self.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=self.server.serve_forever, daemon=True).start()
        self.original_base, self.original_dir = updater.UPDATE_BASE, updater.UPDATE_DIR
        updater.UPDATE_BASE = f"http://127.0.0.1:{self.server.server_port}"
        updater.UPDATE_DIR = os.path.join(self.root, "update")

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        updater.UPDATE_BASE, updater.UPDATE_DIR = self.original_base, self.original_dir
        shutil.rmtree(self.root, ignore_errors=True)

    def test_same_version_is_not_an_update(self):
        self.assertIsNone(updater.check("2.0 beta 1", "main"))

    def test_preview_channel_offers_newer_build(self):
        update = updater.check("2.0 beta 2", "preview")
        self.assertEqual(update["version"], "2.0")
        self.assertEqual(update["channel"], "preview")

    def test_main_never_offers_preview_builds(self):
        self.assertIsNone(updater.check("2.0 beta 2", "main"))

    def test_download_verifies_checksum(self):
        update = updater.check("2.0 beta 2", "preview")
        path = updater.download(update)
        with open(path, "rb") as f:
            self.assertEqual(f.read(), self.package)

    def test_damaged_download_is_rejected(self):
        update = dict(updater.check("2.0 beta 2", "preview"), sha256="0" * 64)
        with self.assertRaises(updater.UpdateError):
            updater.download(update)

    def test_unreachable_server_raises_update_error(self):
        updater.UPDATE_BASE = "http://127.0.0.1:9"
        with self.assertRaises(updater.UpdateError):
            updater.check("2.0 beta 2", "main", timeout=2)


class ReleaseDiscoveryTest(unittest.TestCase):
    def setUp(self):
        self.base = updater.UPDATE_BASE
        updater.UPDATE_BASE = f"https://raw.githubusercontent.com/{updater.REPO}"
        self.package = b"synthetic package"
        self.manifest = json.dumps({"windows": {"version": "2.0.1-beta.1", "sha256": hashlib.sha256(self.package).hexdigest(), "size": len(self.package)}}).encode()
        prefix = f"https://github.com/{updater.REPO}/releases/download/v2.0-rc.4/"
        def asset(name, data, identifier):
            return {"name": name, "id": identifier, "size": len(data), "digest": "sha256:" + hashlib.sha256(data).hexdigest(), "browser_download_url": prefix + name}
        self.preview = {"id": 1, "tag_name": "v2.0-rc.4", "draft": False, "prerelease": True,
                        "assets": [asset("latest.json", self.manifest, 2), asset("ClipSync.zip", self.package, 3)]}
        self.releases = [self.preview]
        def fetch(request, **kwargs):
            self.assertTrue(kwargs["context"].check_hostname)
            self.assertEqual(kwargs["context"].verify_mode, ssl.CERT_REQUIRED)
            url = request.full_url
            return io.BytesIO(json.dumps(self.releases).encode() if url == updater.RELEASE_API else self.manifest)
        self.fetcher = patch.object(updater.urllib.request, "urlopen", side_effect=fetch)
        self.fetcher.start()
        self.platform = patch.object(updater, "platform_key", return_value="windows")
        self.platform.start()

    def tearDown(self):
        self.platform.stop()
        self.fetcher.stop()
        updater.UPDATE_BASE = self.base

    def test_preview_selects_verified_release_asset(self):
        result = updater.check("2.0", "preview")
        self.assertEqual(result["version"], "2.0.1-beta.1")
        self.assertEqual(result["asset_id"], 3)
        self.assertTrue(result["url"].endswith("/ClipSync.zip"))

    def test_stable_excludes_preview(self):
        self.assertIsNone(updater.check("1.0", "main"))

    def test_current_preview_does_not_downgrade(self):
        self.assertIsNone(updater.check("2.0.1-beta.1", "preview"))

    def test_draft_is_not_an_update(self):
        self.preview["draft"] = True
        self.assertIsNone(updater.check("2.0", "preview"))

    def test_unknown_version_is_ignored(self):
        self.preview["tag_name"] = "unsupported"
        self.assertIsNone(updater.check("2.0", "preview"))

    def test_bad_manifest_digest_is_rejected(self):
        self.manifest += b" "
        with self.assertRaisesRegex(updater.UpdateError, "checksum"):
            updater.check("2.0", "preview")

    def test_missing_asset_is_rejected(self):
        self.preview["assets"].pop()
        with self.assertRaisesRegex(updater.UpdateError, "unique"):
            updater.check("2.0", "preview")

    def test_wrong_asset_host_is_rejected(self):
        self.preview["assets"][1]["browser_download_url"] = "https://example.com/package.zip"
        with self.assertRaisesRegex(updater.UpdateError, "location"):
            updater.check("2.0", "preview")

    def test_missing_digest_is_rejected(self):
        self.preview["assets"][1].pop("digest")
        with self.assertRaisesRegex(updater.UpdateError, "digest"):
            updater.check("2.0", "preview")


class PackageSafetyTest(unittest.TestCase):
    def test_archive_paths_are_checked_before_extraction(self):
        with tempfile.TemporaryDirectory() as folder:
            package = os.path.join(folder, "package.zip")
            with zipfile.ZipFile(package, "w") as archive:
                archive.writestr("ClipSync/ClipSync.exe", b"fixture")
            updater._validate_windows_package(package)
            with zipfile.ZipFile(package, "a") as archive:
                archive.writestr("ClipSync/../../outside", b"bad")
            with self.assertRaisesRegex(updater.UpdateError, "Unsafe path"):
                updater._validate_windows_package(package)


if __name__ == "__main__":
    unittest.main(verbosity=2)
