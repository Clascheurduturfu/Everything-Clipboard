"""
ClipSync Desktop Client - cross-platform system tray app for encrypted clipboard sync.
"""

import asyncio
import json
import logging
import os
import platform
import plistlib
import shutil
import ssl
import subprocess
import sys
import textwrap
import threading
import time
import urllib.error
import urllib.request

import pystray
import websockets
from PIL import Image, ImageDraw

from clipboard import get_clipboard, set_clipboard
from crypto_utils import decrypt_payload, derive_key, encrypt_payload, get_room_id
from host_server import start_host_server

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("clipsync")

CONFIG_DIR = os.path.expanduser("~/.clipsync")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
LOG_FILE = os.path.join(CONFIG_DIR, "clipsync.log")
LOCAL_RELAY_URL = "ws://127.0.0.1:8000"
RUN_KEY_NAME = "ClipSync"
MAC_LAUNCH_AGENT = os.path.expanduser("~/Library/LaunchAgents/com.clipsync.app.plist")

DEFAULT_CONFIG = {
    "device_name": platform.node() or "Desktop",
    "server_url": "",
    "normal_server_url": "",
    "secret_key": "",
    "host_mode": False,
    "use_ngrok_with_host": False,
    "ngrok_public_url": "",
    "start_on_login": False,
}


def find_executable(name: str) -> str | None:
    path = shutil.which(name)
    if path:
        return path

    if platform.system() == "Darwin":
        for candidate in (
            f"/opt/homebrew/bin/{name}",
            f"/usr/local/bin/{name}",
            f"/usr/bin/{name}",
            f"/bin/{name}",
        ):
            if os.path.isfile(candidate) and os.access(candidate, os.X_OK):
                return candidate
    return None


def load_config() -> dict:
    os.makedirs(CONFIG_DIR, exist_ok=True)
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                return {**DEFAULT_CONFIG, **json.load(f)}
        except Exception as exc:
            logger.warning("Could not load config: %s", exc)
    return dict(DEFAULT_CONFIG)


def save_config(config: dict):
    os.makedirs(CONFIG_DIR, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)


def configure_file_logging():
    os.makedirs(CONFIG_DIR, exist_ok=True)
    if any(isinstance(handler, logging.FileHandler) for handler in logger.handlers):
        return

    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(
        logging.Formatter(
            "%(asctime)s [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
    )
    logger.addHandler(file_handler)
    logger.info("Logging to %s", LOG_FILE)


def launch_arguments(extra_args: list[str] | None = None) -> list[str]:
    args = [sys.executable] if getattr(sys, "frozen", False) else [sys.executable, os.path.abspath(__file__)]
    if extra_args:
        args.extend(extra_args)
    return args


def show_preferences_dialog() -> bool:
    import tkinter as tk

    config = load_config()
    root = tk.Tk()
    root.title("ClipSync Preferences")
    root.resizable(False, False)
    root.configure(padx=18, pady=16)

    device_var = tk.StringVar(value=config.get("device_name", "Desktop"))
    server_var = tk.StringVar(value=config.get("normal_server_url") or config.get("server_url", ""))
    secret_var = tk.StringVar(value=config.get("secret_key", ""))
    startup_var = tk.BooleanVar(value=bool(config.get("start_on_login")))
    host_var = tk.BooleanVar(value=bool(config.get("host_mode")))
    ngrok_var = tk.BooleanVar(value=bool(config.get("use_ngrok_with_host")))
    saved = {"value": False}

    def row(label: str, widget, idx: int):
        tk.Label(root, text=label, anchor="w").grid(row=idx, column=0, sticky="w", pady=5)
        widget.grid(row=idx, column=1, sticky="ew", pady=5)

    root.columnconfigure(1, minsize=320)
    row("Device name", tk.Entry(root, textvariable=device_var, width=42), 0)
    row("Server URL", tk.Entry(root, textvariable=server_var, width=42), 1)
    row("Secret key", tk.Entry(root, textvariable=secret_var, width=42, show="*"), 2)
    tk.Checkbutton(root, text="Start ClipSync on login", variable=startup_var).grid(
        row=3, column=0, columnspan=2, sticky="w", pady=(10, 2)
    )
    tk.Checkbutton(root, text="Host Mode", variable=host_var).grid(
        row=4, column=0, columnspan=2, sticky="w", pady=2
    )
    tk.Checkbutton(root, text="Use ngrok with Host Mode", variable=ngrok_var).grid(
        row=5, column=0, columnspan=2, sticky="w", pady=2
    )

    button_frame = tk.Frame(root)
    button_frame.grid(row=6, column=0, columnspan=2, sticky="e", pady=(16, 0))

    def save_and_close():
        server_url = server_var.get().strip()
        config.update(
            {
                "device_name": device_var.get().strip() or "Desktop",
                "normal_server_url": server_url,
                "secret_key": secret_var.get().strip(),
                "start_on_login": bool(startup_var.get()),
                "host_mode": bool(host_var.get()),
                "use_ngrok_with_host": bool(ngrok_var.get()),
                "ngrok_public_url": "",
                "server_url": LOCAL_RELAY_URL if host_var.get() else server_url,
            }
        )
        save_config(config)
        saved["value"] = True
        root.destroy()

    tk.Button(button_frame, text="Cancel", command=root.destroy).pack(side="right", padx=(8, 0))
    tk.Button(button_frame, text="Save", command=save_and_close).pack(side="right")
    root.mainloop()
    return saved["value"]


def create_icon_image(color: str) -> Image.Image:
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    colors = {
        "gray": (125, 136, 150, 255),
        "green": (0, 194, 168, 255),
        "orange": (255, 184, 77, 255),
        "blue": (74, 144, 217, 255),
        "red": (224, 92, 92, 255),
    }
    fill = colors.get(color, colors["gray"])
    draw.rounded_rectangle([6, 6, size - 6, size - 6], radius=14, fill=fill)
    draw.rounded_rectangle([21, 17, 43, 49], radius=3, fill=(255, 255, 255, 230))
    draw.rounded_rectangle([25, 12, 39, 22], radius=3, fill=(255, 255, 255, 230))
    draw.rectangle([26, 29, 38, 32], fill=fill)
    draw.rectangle([26, 37, 38, 40], fill=fill)
    return img


class ClipSyncApp:
    def __init__(self):
        self.config = load_config()
        self.config_lock = threading.RLock()
        self.is_connected = False
        self.is_running = True
        self.last_clipboard = ""
        self.last_received_device = ""
        self.last_received_content = ""
        self.status_message = ""
        self.ws_loop: asyncio.AbstractEventLoop | None = None
        self.send_queue: asyncio.Queue | None = None
        self.stop_event = threading.Event()
        self.key: bytes | None = None
        self.server_thread = None
        self.ws_thread: threading.Thread | None = None
        self.ngrok_process: subprocess.Popen | None = None
        self.preferences_open = False

        self.icon = pystray.Icon("ClipSync")
        self.icon.icon = create_icon_image("gray")
        self.icon.title = "ClipSync - Disconnected"
        self._rebuild_menu()

    def _rebuild_menu(self):
        status = "Connected" if self.is_connected else "Disconnected"
        if self.status_message:
            status = self.status_message

        last_text = "Last: none"
        if self.last_received_content:
            short = textwrap.shorten(self.last_received_content, width=38, placeholder="...")
            last_text = f'Last: "{short}" from {self.last_received_device}'

        host_text = "Host Mode: ON" if self.config.get("host_mode") else "Host Mode: OFF"
        ngrok_text = (
            "Use ngrok with Host: ON"
            if self.config.get("use_ngrok_with_host")
            else "Use ngrok with Host: OFF"
        )

        items = [
            pystray.MenuItem(f"Status: {status}", None, enabled=False),
            pystray.MenuItem(last_text, None, enabled=False),
        ]
        if self.config.get("ngrok_public_url"):
            items.append(pystray.MenuItem(f"Mobile URL: {self.config['ngrok_public_url']}", None, enabled=False))

        items.extend(
            [
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Preferences...", self._open_preferences_from_tray),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem(host_text, self._toggle_host_mode_from_tray),
                pystray.MenuItem(ngrok_text, self._toggle_ngrok_from_tray),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem(
                    "Connect" if not self.is_connected else "Disconnect",
                    self._toggle_connection,
                ),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Quit", self._quit),
            ]
        )
        self.icon.menu = pystray.Menu(*items)

    def _set_status(self, message: str, icon_color: str | None = None):
        self.status_message = message
        if icon_color:
            self.icon.icon = create_icon_image(icon_color)
        self.icon.title = f"ClipSync - {message}"
        self._rebuild_menu()

    def _open_preferences_from_tray(self, icon=None, item=None):
        self.open_preferences()

    def open_preferences(self):
        if self.preferences_open:
            return

        def _run_preferences_process():
            self.preferences_open = True
            try:
                process = subprocess.Popen(
                    launch_arguments(["--preferences"]),
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                )
                result = process.wait()
                if result == 0:
                    self.reload_preferences_from_disk()
                elif result not in (0, 1):
                    logger.warning("Preferences exited with code %s", result)
            finally:
                self.preferences_open = False

        threading.Thread(target=_run_preferences_process, daemon=True).start()

    def reload_preferences_from_disk(self):
        disk_config = load_config()
        with self.config_lock:
            old = dict(self.config)
            self.config = {**DEFAULT_CONFIG, **disk_config}

        self._set_start_on_login(bool(self.config.get("start_on_login")))
        if self.config.get("host_mode"):
            self._enable_host_mode(reconnect=False)
        else:
            self._disable_host_mode(reconnect=False)

        settings_changed = any(
            old.get(key) != self.config.get(key)
            for key in ("device_name", "server_url", "secret_key", "host_mode")
        )
        self._rebuild_menu()
        if settings_changed:
            self._reconnect_if_configured()

    def apply_preferences(self, updates: dict, host_enabled: bool):
        with self.config_lock:
            old = dict(self.config)
            self.config.update(updates)
            self.config["host_mode"] = bool(host_enabled)

            if self.config["host_mode"]:
                normal_url = self.config.get("normal_server_url") or old.get("normal_server_url")
                if normal_url and normal_url != LOCAL_RELAY_URL:
                    self.config["normal_server_url"] = normal_url
                self.config["server_url"] = LOCAL_RELAY_URL
            else:
                self.config["server_url"] = self.config.get("normal_server_url", "")
                self.config["ngrok_public_url"] = ""

            save_config(self.config)

        self._set_start_on_login(bool(updates.get("start_on_login")))
        if host_enabled:
            self._enable_host_mode(reconnect=False)
        else:
            self._disable_host_mode(reconnect=False)

        settings_changed = any(
            old.get(key) != self.config.get(key)
            for key in ("device_name", "server_url", "secret_key", "host_mode")
        )
        self._rebuild_menu()
        if settings_changed:
            self._reconnect_if_configured()

    def _toggle_host_mode_from_tray(self, icon=None, item=None):
        if self.config.get("host_mode"):
            self._disable_host_mode()
        else:
            self._enable_host_mode()

    def _enable_host_mode(self, reconnect: bool = True):
        with self.config_lock:
            if self.config.get("server_url") and self.config.get("server_url") != LOCAL_RELAY_URL:
                self.config["normal_server_url"] = self.config["server_url"]
            self.config["host_mode"] = True
            self.config["server_url"] = LOCAL_RELAY_URL
            save_config(self.config)

        self._start_host()
        if self.config.get("use_ngrok_with_host"):
            self._start_ngrok()
        else:
            self._stop_ngrok()
        self._set_status("Host Mode running", "blue")
        if reconnect:
            self._reconnect_if_configured()

    def _disable_host_mode(self, reconnect: bool = True):
        self._stop_ngrok()
        self._stop_host()
        with self.config_lock:
            self.config["host_mode"] = False
            self.config["ngrok_public_url"] = ""
            self.config["server_url"] = self.config.get("normal_server_url", "")
            save_config(self.config)
        self._set_status("Host Mode stopped", "gray")
        if reconnect:
            self._reconnect_if_configured()

    def _toggle_ngrok_from_tray(self, icon=None, item=None):
        with self.config_lock:
            self.config["use_ngrok_with_host"] = not self.config.get("use_ngrok_with_host", False)
            enabled = self.config["use_ngrok_with_host"]
            save_config(self.config)

        if self.config.get("host_mode"):
            if enabled:
                self._start_ngrok()
            else:
                self._stop_ngrok()
        self._rebuild_menu()

    def _start_host(self):
        if self.server_thread and self.server_thread.is_alive:
            return
        try:
            self.server_thread = start_host_server(host="127.0.0.1", port=8000)
            logger.info("Host Mode local relay started on %s", LOCAL_RELAY_URL)
        except Exception as exc:
            logger.error("Could not start Host Mode: %s", exc)
            self._set_status(f"Host error: {exc}", "red")

    def _stop_host(self):
        if self.server_thread:
            self.server_thread.stop()
            self.server_thread = None

    def _start_ngrok(self):
        if self.ngrok_process and self.ngrok_process.poll() is None:
            return

        ngrok_path = find_executable("ngrok")
        if not ngrok_path:
            self._set_status("ngrok not found", "orange")
            logger.warning("ngrok is not installed or not visible to ClipSync")
            return

        cmd = [ngrok_path, "http", "8000"]
        if platform.system() == "Windows" and ngrok_path.lower().endswith(".ps1"):
            cmd = ["powershell", "-ExecutionPolicy", "Bypass", "-File", ngrok_path, "http", "8000"]

        try:
            self.ngrok_process = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0,
            )
        except Exception as exc:
            self._set_status(f"ngrok failed: {exc}", "orange")
            logger.warning("Could not start ngrok: %s", exc)
            return

        threading.Thread(target=self._wait_for_ngrok_url, daemon=True).start()

    def _wait_for_ngrok_url(self):
        for _ in range(30):
            url = self._read_ngrok_url()
            if url:
                with self.config_lock:
                    self.config["ngrok_public_url"] = url
                    save_config(self.config)
                self.last_clipboard = url
                set_clipboard(url)
                self._set_status("ngrok tunnel ready", "blue")
                logger.info("ngrok mobile URL: %s", url)
                return
            time.sleep(0.5)
        self._set_status("ngrok tunnel not ready", "orange")

    def _read_ngrok_url(self) -> str:
        try:
            with urllib.request.urlopen("http://127.0.0.1:4040/api/tunnels", timeout=1) as response:
                data = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError):
            return ""

        for tunnel in data.get("tunnels", []):
            public_url = tunnel.get("public_url", "")
            if public_url.startswith("https://"):
                return "wss://" + public_url[len("https://") :]
            if public_url.startswith("http://"):
                return "ws://" + public_url[len("http://") :]
        return ""

    def _stop_ngrok(self):
        if self.ngrok_process and self.ngrok_process.poll() is None:
            self.ngrok_process.terminate()
            try:
                self.ngrok_process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                self.ngrok_process.kill()
        self.ngrok_process = None
        with self.config_lock:
            self.config["ngrok_public_url"] = ""
            save_config(self.config)

    def _toggle_connection(self, icon=None, item=None):
        if self.is_connected:
            self._disconnect()
        else:
            self._connect()

    def _connect(self):
        with self.config_lock:
            server_url = self.config.get("server_url", "")
            secret_key = self.config.get("secret_key", "")

        if not server_url or not secret_key:
            self._set_status("Open Preferences", "orange")
            logger.error("Cannot connect: server_url or secret_key not set")
            return

        if self.ws_thread and self.ws_thread.is_alive():
            return

        self.stop_event.clear()
        self.key = derive_key(secret_key)
        self.ws_thread = threading.Thread(target=self._ws_thread, daemon=True)
        self.ws_thread.start()

    def _disconnect(self):
        self.stop_event.set()
        self.is_connected = False
        self.icon.icon = create_icon_image("gray")
        self.icon.title = "ClipSync - Disconnected"
        self._rebuild_menu()

    def _reconnect_if_configured(self):
        self._disconnect()
        time.sleep(0.2)
        self._connect()

    def _ws_thread(self):
        self.ws_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.ws_loop)
        self.send_queue = asyncio.Queue()
        try:
            self.ws_loop.run_until_complete(self._ws_client_loop())
        except Exception as exc:
            logger.error("WS thread crashed: %s", exc)
        finally:
            self.is_connected = False
            self.icon.icon = create_icon_image("gray")
            self.icon.title = "ClipSync - Disconnected"
            self._rebuild_menu()
            self.ws_thread = None

    async def _ws_client_loop(self):
        with self.config_lock:
            room_id = get_room_id(self.config["secret_key"])
            url = self.config["server_url"].rstrip("/")
        ws_url = f"{url}/ws/{room_id}"
        logger.info("Connecting to %s", ws_url)
        ssl_context = None
        if ws_url.startswith("wss"):
            ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE

        while not self.stop_event.is_set():
            try:
                async with websockets.connect(
                    ws_url,
                    ssl=ssl_context,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                ) as ws:
                    self.is_connected = True
                    self.status_message = ""
                    self.icon.icon = create_icon_image("green")
                    self.icon.title = "ClipSync - Connected"
                    self._rebuild_menu()
                    logger.info("Connected to server")

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
            except Exception as exc:
                if self.stop_event.is_set():
                    break
                logger.warning("Connection failed: %s. Retrying in 3s...", exc)
                self.is_connected = False
                self._set_status("Reconnecting...", "orange")
                await asyncio.sleep(3)

        self.is_connected = False

    async def _receive_loop(self, ws):
        async for message in ws:
            try:
                payload = decrypt_payload(message, self.key)
                content = payload.get("content", "")
                device = payload.get("device_name", "Unknown")

                logger.info("Received from %s: %s...", device, content[:40])
                self.last_clipboard = content
                self.last_received_device = device
                self.last_received_content = content
                set_clipboard(content)
                self._rebuild_menu()
            except Exception as exc:
                logger.error("Decrypt/receive error: %s", exc)

    async def _send_loop(self, ws):
        while not self.stop_event.is_set():
            try:
                message = await asyncio.wait_for(self.send_queue.get(), timeout=1.0)
                await ws.send(message)
            except asyncio.TimeoutError:
                continue
            except Exception as exc:
                logger.error("Send error: %s", exc)
                break

    def _poll_clipboard(self):
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
                            self.config["device_name"],
                            current,
                            self.key,
                        )
                        asyncio.run_coroutine_threadsafe(self.send_queue.put(payload), self.ws_loop)
                        logger.info("Sent: %s...", current[:40])
            except Exception:
                pass
            time.sleep(0.5)

    def _set_start_on_login(self, enabled: bool):
        system = platform.system()
        if system == "Windows":
            self._set_windows_startup(enabled)
        elif system == "Darwin":
            self._set_macos_startup(enabled)
        else:
            logger.info("Start on login is not implemented for %s", system)

    def _launch_arguments(self) -> list[str]:
        return launch_arguments()

    def _launch_command(self) -> str:
        return subprocess.list2cmdline(self._launch_arguments())

    def _set_windows_startup(self, enabled: bool):
        import winreg

        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_SET_VALUE,
        ) as key:
            if enabled:
                winreg.SetValueEx(key, RUN_KEY_NAME, 0, winreg.REG_SZ, self._launch_command())
            else:
                try:
                    winreg.DeleteValue(key, RUN_KEY_NAME)
                except FileNotFoundError:
                    pass

    def _set_macos_startup(self, enabled: bool):
        os.makedirs(os.path.dirname(MAC_LAUNCH_AGENT), exist_ok=True)
        if enabled:
            plist = {
                "Label": "com.clipsync.app",
                "ProgramArguments": self._launch_arguments(),
                "RunAtLoad": True,
                "KeepAlive": False,
            }
            with open(MAC_LAUNCH_AGENT, "wb") as f:
                plistlib.dump(plist, f)
        else:
            try:
                os.remove(MAC_LAUNCH_AGENT)
            except FileNotFoundError:
                pass

    def _quit(self, icon=None, item=None):
        self.is_running = False
        self.stop_event.set()
        self._stop_ngrok()
        self._stop_host()
        self.icon.stop()

    def _on_tray_ready(self, icon):
        logger.info("Tray icon setup started")
        icon.visible = True

        if self.config.get("host_mode"):
            self._enable_host_mode(reconnect=False)

        if not self.config.get("server_url") or not self.config.get("secret_key"):
            save_config(self.config)
            self.open_preferences()

        poll_thread = threading.Thread(target=self._poll_clipboard, daemon=True)
        poll_thread.start()

        if self.config.get("server_url") and self.config.get("secret_key"):
            self._connect()
        logger.info("Tray icon setup finished")

    def run(self):
        configure_file_logging()
        logger.info("ClipSync starting on %s", platform.system())
        logger.info("Config file: %s", CONFIG_FILE)
        try:
            self.icon.run(setup=self._on_tray_ready)
        except Exception:
            logger.exception("Tray loop crashed")
            raise


if __name__ == "__main__":
    if "--preferences" in sys.argv:
        configure_file_logging()
        try:
            raise SystemExit(0 if show_preferences_dialog() else 1)
        except Exception:
            logger.exception("Preferences dialog crashed")
            raise

    ClipSyncApp().run()
