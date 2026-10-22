"""Tests for the in-app updater's version logic, manifest check and download.

Run:  python test_updater.py
"""

import functools
import hashlib
import http.server
import json
import os
import shutil
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, ".")

import updater  # noqa: E402


class VersionTest(unittest.TestCase):
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
        for branch, version in (("main", "2.0 beta 1"), ("preview", "2.0 beta 3")):
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
        self.assertEqual(update["version"], "2.0 beta 3")
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
