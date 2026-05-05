"""
ClipSync Desktop Client — Cross-platform (macOS + Windows)
System tray app that syncs clipboard between devices via an encrypted WebSocket relay.
"""

import asyncio
import json
import logging
import os
import platform
import sys
import textwrap
import threading
import time
import ssl


import pystray
import websockets
from PIL import Image, ImageDraw

from clipboard import get_clipboard, set_clipboard
from crypto_utils import derive_key, get_room_id, encrypt_payload, decrypt_payload
from host_server import start_host_server

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("clipsync")

# --- Config ---
CONFIG_DIR = os.path.expanduser("~/.clipsync")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")

DEFAULT_CONFIG = {
    "device_name": platform.node() or "Desktop",
    "server_url": "",
    "secret_key": "",
    "host_mode": False,
}


def load_config() -> dict:
    os.makedirs(CONFIG_DIR, exist_ok=True)
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                saved = json.load(f)
                config = {**DEFAULT_CONFIG, **saved}
                return config
        except Exception:
            pass
    return dict(DEFAULT_CONFIG)


def save_config(config: dict):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w") as f:
        json.dump(config, f, indent=2)


# --- Icon generation (no external icon files needed) ---
def create_icon_image(color: str) -> Image.Image:
    """Generate a simple colored circle icon for the system tray."""
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    colors = {
        "gray": (150, 150, 150, 255),
        "green": (50, 205, 50, 255),
        "orange": (255, 165, 0, 255),
    }
    fill = colors.get(color, colors["gray"])
    draw.ellipse([8, 8, size - 8, size - 8], fill=fill)
    # Draw a small clipboard shape in the center
    draw.rectangle([22, 16, 42, 48], fill=(255, 255, 255, 200))
    draw.rectangle([26, 12, 38, 20], fill=(255, 255, 255, 200))
    return img


# --- Main App ---
class ClipSyncApp:
    def __init__(self):
        self.config = load_config()
        self.is_connected = False
        self.is_running = True
        self.last_clipboard = ""
        self.last_received_device = ""
        self.last_received_content = ""
        self.ws_loop: asyncio.AbstractEventLoop = None
        self.send_queue: asyncio.Queue = None
        self.stop_event = threading.Event()
        self.key: bytes = None
        self.server_thread = None

        # Build tray icon and menu
        self.icon = pystray.Icon("ClipSync")
        self.icon.icon = create_icon_image("gray")
        self.icon.title = "ClipSync — Disconnected"
        self._rebuild_menu()

    def _rebuild_menu(self):
        """Rebuild the system tray right-click menu."""
        status_text = "🟢 Connected" if self.is_connected else "⚫ Disconnected"
        host_text = "Host Mode: ON" if self.config.get("host_mode") else "Host Mode: OFF"

        last_text = "Last Copied: (none)"
        if self.last_received_content:
            short = textwrap.shorten(self.last_received_content, width=35, placeholder="...")
            last_text = f'Last: "{short}" (from {self.last_received_device})'

        self.icon.menu = pystray.Menu(
            pystray.MenuItem(f"Status: {status_text}", None, enabled=False),
            pystray.MenuItem(last_text, None, enabled=False),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(host_text, self._toggle_host_mode),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem(
                "Connect" if not self.is_connected else "Disconnect",
                self._toggle_connection,
            ),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem("Quit", self._quit),
        )

    def _toggle_host_mode(self, icon, item):
        self.config["host_mode"] = not self.config.get("host_mode", False)
        save_config(self.config)
        if self.config["host_mode"]:
            self._start_host()
        self._rebuild_menu()

    def _start_host(self):
        if self.server_thread and self.server_thread.is_alive():
            return
        self.server_thread = start_host_server(8000)
        logger.info("Host Mode started on port 8000")

    def _toggle_connection(self, icon, item):
        if self.is_connected:
            self._disconnect()
        else:
            self._connect()

    def _connect(self):
        if not self.config.get("server_url") or not self.config.get("secret_key"):
            logger.error("Cannot connect: server_url or secret_key not set in config!")
            logger.error(f"Edit your config file: {CONFIG_FILE}")
            return
        self.stop_event.clear()
        self.key = derive_key(self.config["secret_key"])
        t = threading.Thread(target=self._ws_thread, daemon=True)
        t.start()

    def _disconnect(self):
        self.stop_event.set()
        self.is_connected = False
        self.icon.icon = create_icon_image("gray")
        self.icon.title = "ClipSync — Disconnected"
        self._rebuild_menu()

    def _ws_thread(self):
        """Run the async WebSocket event loop in its own thread."""
        self.ws_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.ws_loop)
        self.send_queue = asyncio.Queue()
        try:
            self.ws_loop.run_until_complete(self._ws_client_loop())
        except Exception as e:
            logger.error(f"WS thread crashed: {e}")
        finally:
            self.is_connected = False
            self.icon.icon = create_icon_image("gray")
            self.icon.title = "ClipSync — Disconnected"
            self._rebuild_menu()

    async def _ws_client_loop(self):
        room_id = get_room_id(self.config["secret_key"])
        url = self.config["server_url"].rstrip("/")
        ws_url = f"{url}/ws/{room_id}"
        logger.info(f"Connecting to {ws_url}")
        ssl_context = None
        if ws_url.startswith("wss"):
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

        while not self.stop_event.is_set():
            try:
                async with websockets.connect(
                    ws_url,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                ) as ws:
                    self.is_connected = True
                    self.icon.icon = create_icon_image("green")
                    self.icon.title = "ClipSync — Connected"
                    self._rebuild_menu()
                    logger.info("Connected to server!")

                    recv_task = asyncio.create_task(self._receive_loop(ws))
                    send_task = asyncio.create_task(self._send_loop(ws))

                    done, pending = await asyncio.wait(
                        [recv_task, send_task],
                        return_when=asyncio.FIRST_COMPLETED,
                    )
                    for task in pending:
                        task.cancel()
                        try:
                            await task
                        except asyncio.CancelledError:
                            pass

            except Exception as e:
                logger.warning(f"Connection failed: {e}. Retrying in 3s...")
                self.is_connected = False
                self.icon.icon = create_icon_image("orange")
                self.icon.title = "ClipSync — Reconnecting..."
                self._rebuild_menu()
                await asyncio.sleep(3)

        self.is_connected = False

    async def _receive_loop(self, ws):
        async for message in ws:
            try:
                payload = decrypt_payload(message, self.key)
                content = payload.get("content", "")
                device = payload.get("device_name", "Unknown")

                logger.info(f"Received from {device}: {content[:40]}...")
                self.last_clipboard = content
                self.last_received_device = device
                self.last_received_content = content
                set_clipboard(content)
                self._rebuild_menu()
            except Exception as e:
                logger.error(f"Decrypt/receive error: {e}")

    async def _send_loop(self, ws):
        while not self.stop_event.is_set():
            try:
                message = await asyncio.wait_for(self.send_queue.get(), timeout=1.0)
                await ws.send(message)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Send error: {e}")
                break

    def _poll_clipboard(self):
        """Poll the clipboard every 500ms for changes. Runs in a background thread."""
        # Wait for initial clipboard read
        try:
            self.last_clipboard = get_clipboard()
        except Exception:
            pass

        while self.is_running:
            try:
                current = get_clipboard()
                if current and current != self.last_clipboard:
                    self.last_clipboard = current
                    self.last_received_device = self.config.get("device_name", "Desktop")
                    self.last_received_content = current
                    self._rebuild_menu()

                    if self.is_connected and self.send_queue and self.ws_loop:
                        payload = encrypt_payload(
                            self.config["device_name"], current, self.key
                        )
                        asyncio.run_coroutine_threadsafe(
                            self.send_queue.put(payload), self.ws_loop
                        )
                        logger.info(f"Sent: {current[:40]}...")
            except Exception as e:
                pass
            time.sleep(0.5)

    def _quit(self, icon, item):
        self.is_running = False
        self.stop_event.set()
        icon.stop()

    def run(self):
        """Start the system tray app."""
        logger.info(f"ClipSync starting on {platform.system()}")
        logger.info(f"Config file: {CONFIG_FILE}")

        if not self.config.get("server_url") or not self.config.get("secret_key"):
            logger.warning("="*50)
            logger.warning(f"FIRST RUN: Please edit your config file:")
            logger.warning(f"  {CONFIG_FILE}")
            logger.warning("Set 'server_url' and 'secret_key', then restart.")
            logger.warning("="*50)
            save_config(self.config)

        # Start host server if configured
        if self.config.get("host_mode"):
            self._start_host()

        # Start clipboard polling in background
        poll_thread = threading.Thread(target=self._poll_clipboard, daemon=True)
        poll_thread.start()

        # Auto-connect if config is ready
        if self.config.get("server_url") and self.config.get("secret_key"):
            self._connect()

        # Run the system tray (this blocks on the main thread)
        self.icon.run()


if __name__ == "__main__":
    app = ClipSyncApp()
    app.run()
