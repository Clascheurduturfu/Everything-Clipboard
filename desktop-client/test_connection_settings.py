import re
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


if __name__ == '__main__':
    unittest.main()
