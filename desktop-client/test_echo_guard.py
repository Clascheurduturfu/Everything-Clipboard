"""Regression tests for the clipboard echo loop.

The bug: `_receive_loop` moved `last_clipboard` to the incoming value *before*
`set_clipboard` had finished writing.  The 0.5 s poller, running on another
thread, could read the clipboard inside that window, see the still-old value,
conclude "the user copied something new" and ship it straight back.  On macOS
`pbcopy` is a subprocess (tens of milliseconds) so the window was wide enough
to hit constantly; on Windows the in-process Win32 write closed it in
microseconds, which is why only macOS bounced.

Run:  python test_echo_guard.py
"""

import sys
import threading
import time
import types
import unittest

sys.path.insert(0, ".")


class FakeClipboard:
    """A clipboard whose writes take a realistic, non-zero amount of time."""

    def __init__(self, initial="", write_delay=0.05, has_files=False):
        self._value = initial
        self._write_delay = write_delay
        self._token = 1
        self._lock = threading.Lock()
        self.has_files = has_files
        self._image = None

    def get(self):
        with self._lock:
            return self._value

    def set(self, text):
        # Simulate pbcopy: the clipboard still holds the OLD value for a while.
        time.sleep(self._write_delay)
        with self._lock:
            self._value = text
            self._image = None
            self._token += 1

    def set_image(self, png, image, text=""):
        time.sleep(self._write_delay)
        with self._lock:
            self._image = image.copy()
            self._value = text
            self._token += 1

    def has_image(self):
        with self._lock:
            return self._image is not None

    def get_image(self):
        # Like Windows, hand back a *re-encoded* copy: same pixels, new bytes.
        import io
        from PIL import Image

        with self._lock:
            if self._image is None:
                return None
            buf = io.BytesIO()
            self._image.save(buf, "PNG", compress_level=9)
        return Image.open(io.BytesIO(buf.getvalue()))

    def token(self):
        with self._lock:
            return self._token


def build_app(fake, module):
    """Build a ClipSyncApp with the guard logic but no system tray."""
    from collections import OrderedDict

    app = object.__new__(module.ClipSyncApp)
    app.config = {"device_name": "TestMac", "secret_key": "k"}
    app.is_running = True
    app.is_connected = True
    app.last_clipboard = fake.get()
    app.last_received_device = ""
    app.last_received_content = ""
    app.key = b"0" * 32
    app.send_queue = object()
    app.ws_loop = object()
    app._clip_lock = threading.RLock()
    app._recent_sync_values = OrderedDict()
    app.recent_clips = module.deque(maxlen=module.RECENT_CLIPS_MAX)
    app._applying_remote = False
    app._last_change_token = fake.token()
    app.recent_clips = module.deque(maxlen=module.RECENT_CLIPS_MAX)
    app.last_image_fingerprint = ""
    app.status_message = ""
    app._rebuild_menu = lambda *a, **k: None
    return app


class EchoGuardTest(unittest.TestCase):
    def setUp(self):
        import app as app_module

        self.module = app_module
        self.sent = []

        # Redirect the module's clipboard + transport at the seam.
        self.fake = FakeClipboard(initial="FINDER: Rapport.pdf, Photo.png", write_delay=0.05)
        app_module.get_clipboard = self.fake.get
        app_module.set_clipboard = self.fake.set
        app_module.clipboard_change_token = self.fake.token
        app_module.clipboard_has_files = lambda: self.fake.has_files
        app_module.encrypt_payload = lambda device, content, key: content
        app_module.clipboard_has_image = self.fake.has_image
        app_module.get_clipboard_image = self.fake.get_image
        app_module.set_clipboard_image = lambda png, image: self.fake.set_image(png, image)
        app_module.encrypt_image_payload = lambda device, data, mime, w, h, key: f"IMAGE {w}x{h}"
        app_module.asyncio = types.SimpleNamespace(
            run_coroutine_threadsafe=lambda coro, loop: self.sent.append(coro),
            Queue=object,
        )
        # send_queue.put() is what gets handed to run_coroutine_threadsafe.
        self.app = build_app(self.fake, app_module)
        self.app.send_queue = types.SimpleNamespace(put=lambda payload: payload)

    def _run_poller_during(self, action, settle=0.6):
        poller = threading.Thread(target=self.app._poll_clipboard, daemon=True)
        poller.start()
        time.sleep(0.1)
        action()
        time.sleep(settle)
        self.app.is_running = False
        poller.join(timeout=2)

    def test_incoming_remote_text_is_never_echoed_back(self):
        """The exact macOS bug: receiving must not trigger a send."""
        self._run_poller_during(
            lambda: self.app._apply_remote_clipboard("hello from iPhone")
        )
        self.assertEqual(
            self.sent,
            [],
            f"Remote content was echoed back to the room: {self.sent}",
        )
        self.assertEqual(self.fake.get(), "hello from iPhone")

    def test_stale_local_value_is_not_resent_during_the_write_window(self):
        """The poller must not ship the pre-existing value mid-write."""
        self._run_poller_during(
            lambda: self.app._apply_remote_clipboard("remote payload")
        )
        self.assertNotIn(
            "FINDER: Rapport.pdf, Photo.png",
            self.sent,
            "Stale local clipboard leaked out during the remote write",
        )

    def test_genuine_local_copy_is_still_sent(self):
        """The guard must not block real user copies."""
        self._run_poller_during(lambda: self.fake.set("user copied this"))
        self.assertIn("user copied this", self.sent, "A real local copy was swallowed")

    def test_same_value_is_not_sent_twice(self):
        def copy_twice():
            self.fake.set("duplicate")
            time.sleep(0.3)
            self.fake.set("other")
            time.sleep(0.3)
            self.fake.set("duplicate")

        self._run_poller_during(copy_twice, settle=1.2)
        self.assertEqual(
            self.sent.count("duplicate"),
            1,
            f"Duplicate re-broadcast within the TTL window: {self.sent}",
        )

    def test_file_copy_with_identical_text_is_not_clobbered(self):
        """Never overwrite live file references with their own text flavour."""
        self.fake.has_files = True
        self.fake._value = "FINDER: Rapport.pdf"
        self.app.last_clipboard = "FINDER: Rapport.pdf"
        token_before = self.fake.token()
        self.app._apply_remote_clipboard("FINDER: Rapport.pdf")
        self.assertEqual(
            self.fake.token(),
            token_before,
            "Clipboard was rewritten, destroying the file references",
        )


    # ------------------------------------------------------------------ images

    def _image_payload(self, color=(255, 0, 0)):
        import base64
        import hashlib
        import io
        from PIL import Image

        buf = io.BytesIO()
        Image.new("RGBA", (40, 30), color + (255,)).save(buf, "PNG")
        data = buf.getvalue()
        return {"type": "image", "mime": "image/png", "data": base64.b64encode(data).decode(),
                "sha256": hashlib.sha256(data).hexdigest(), "w": 40, "h": 30}

    def _local_image(self, color=(0, 128, 255)):
        from PIL import Image

        return Image.new("RGB", (40, 30), color)

    def test_incoming_remote_image_is_never_echoed_back(self):
        self._run_poller_during(lambda: self.app._apply_remote_image(self._image_payload(), "iPhone"))
        self.assertEqual(self.sent, [], f"Remote image was echoed back: {self.sent}")
        self.assertTrue(self.fake.has_image())

    def test_local_image_copy_is_sent_once(self):
        def copy_image_twice():
            self.fake.set_image(b"", self._local_image())
            time.sleep(0.4)
            self.fake.set_image(b"", self._local_image())

        self._run_poller_during(copy_image_twice, settle=1.0)
        self.assertEqual(self.sent, ["IMAGE 40x30"], f"Expected one image send: {self.sent}")

    def test_text_wins_over_image(self):
        """Excel puts a picture of the cells next to the text; send the text."""
        self._run_poller_during(lambda: self.fake.set_image(b"", self._local_image(), text="A1	B1"))
        self.assertEqual(self.sent, ["A1	B1"])

    def test_oversize_image_is_skipped(self):
        original = self.module.MAX_IMAGE_BYTES
        self.module.MAX_IMAGE_BYTES = 10
        try:
            self._run_poller_during(lambda: self.fake.set_image(b"", self._local_image()))
        finally:
            self.module.MAX_IMAGE_BYTES = original
        self.assertEqual(self.sent, [])
        self.assertIn("too large", self.app.status_message)


if __name__ == "__main__":
    unittest.main(verbosity=2)
