import re
import asyncio
import threading
from types import SimpleNamespace
import unittest
import app


class ConnectionSettingsTests(unittest.TestCase):
    def test_default_and_custom_routing(self):
        self.assertTrue(app.DEFAULT_CONFIG['custom_server_url'])
        saved = app._preferences_values('Laptop', 'wss://custom.example', 'key', False, False, False, True, 8000,
                                        custom_server=False)
        self.assertEqual(saved['server_url'], app.DEFAULT_RELAY_URL)
        self.assertEqual(saved['normal_server_url'], 'wss://custom.example')
        saved['custom_server_url'] = True
        self.assertEqual(app.remote_relay_url(saved), 'wss://custom.example')

    def test_host_mode_overrides_remote_selection(self):
        saved = app._preferences_values('Laptop', 'wss://custom.example', 'key', False, True, False, True, 8000,
                                        custom_server=False)
        self.assertEqual(saved['server_url'], app.local_relay_url(saved))
        self.assertEqual(saved['normal_server_url'], 'wss://custom.example')

    def test_keys_are_long_url_safe_and_fresh(self):
        keys = {app.generate_secret_key() for _ in range(100)}
        self.assertEqual(len(keys), 100)
        self.assertTrue(all(re.fullmatch(r'[A-Za-z0-9_-]{64}', key) for key in keys))


class LargeTransferTests(unittest.IsolatedAsyncioTestCase):
    async def test_chunked_transfer_reconstructs_payload(self):
        payload = "encrypted-fixture:" + "x" * (1024 * 1024)
        state = SimpleNamespace(stop_event=threading.Event(), send_queue=asyncio.Queue())
        await state.send_queue.put(payload)
        chunks = []

        async def send(message):
            chunks.append(message.split(":", 5))
            if len(chunks) == int(chunks[-1][4]):
                state.stop_event.set()

        await asyncio.wait_for(app.ClipSyncApp._send_loop(state, SimpleNamespace(send=send)), timeout=2)
        self.assertEqual(len(chunks), 3)
        self.assertTrue(re.fullmatch(r"[a-f0-9]{12}", chunks[0][2]))
        self.assertEqual({chunk[2] for chunk in chunks}, {chunks[0][2]})
        self.assertEqual([int(chunk[3]) for chunk in chunks], [0, 1, 2])
        self.assertEqual("".join(chunk[5] for chunk in chunks), payload)


if __name__ == '__main__':
    unittest.main()
