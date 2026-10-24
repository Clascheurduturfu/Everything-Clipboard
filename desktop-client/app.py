"""
ClipSync Desktop Client - cross-platform system tray app for encrypted clipboard sync.
"""

# Annotations stay unevaluated so the Preferences process can skip the tray-only
# imports below (PIL types appear in signatures) without a NameError.
from __future__ import annotations

import asyncio
import hashlib
import io
import json
import logging
import os
from collections import OrderedDict, deque
import platform
import re
import plistlib
import shutil
import socket
import ssl
import subprocess
import sys
import textwrap
import threading
import time
import urllib.error
import urllib.request

# Preferences runs as its own short-lived process (`app.py --preferences`) and
# only needs the settings helpers below, so it skips the tray/network imports.
# host_server (FastAPI + uvicorn, ~1.5 s to import) is only loaded when the
# relay is actually started, see ClipSyncApp._start_host.
_PREFERENCES_PROCESS = "--preferences" in sys.argv

if not _PREFERENCES_PROCESS:
    import pystray
    import websockets
    from PIL import Image, ImageDraw

    from clipboard import (
        clipboard_change_token,
        clipboard_has_files,
        clipboard_has_image,
        get_clipboard,
        get_clipboard_image,
        set_clipboard,
        set_clipboard_image,
    )
    from crypto_utils import (
        decode_image,
        decrypt_payload,
        derive_key,
        encrypt_image_payload,
        encrypt_payload,
        get_room_id,
    )
import updater

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("clipsync")

APP_VERSION = "2.0"
_IS_MACOS = platform.system() == "Darwin"

# A value that crossed the wire (in either direction) is remembered for this
# long so the clipboard poller never broadcasts it a second time.
SYNC_ECHO_TTL_SECONDS = 15.0
SYNC_ECHO_MAX_ENTRIES = 32

# Reconnect backoff: start fast, back off while the server stays unreachable so
# an offline laptop is not hammering the network every few seconds.
RECONNECT_MIN_SECONDS = 2.0
RECONNECT_MAX_SECONDS = 60.0
RECENT_CLIPS_MAX = 5
# Images are memory-heavy, so the recent list keeps only the newest few.
RECENT_IMAGES_MAX = 2
# Encoded image cap. The payload is base64'd twice (image, then ciphertext), so
# an 8 MiB image is ~14.2 MB on the wire, inside the relay's 16 MiB WebSocket
# message limit. Larger images are re-encoded as JPEG / scaled down on send.
MAX_IMAGE_BYTES = 16 * 1024 * 1024
WS_MAX_MESSAGE_BYTES = 32 * 1024 * 1024

CONFIG_DIR = os.path.expanduser("~/.clipsync")
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
LOG_FILE = os.path.join(CONFIG_DIR, "clipsync.log")
LOCK_FILE = os.path.join(CONFIG_DIR, "clipsync.lock")
DEFAULT_HOST_PORT = 8000
RUN_KEY_NAME = "ClipSync"
MAC_LAUNCH_AGENT = os.path.expanduser("~/Library/LaunchAgents/com.clipsync.app.plist")

DEFAULT_CONFIG = {
    "device_name": platform.node() or "Desktop",
    "server_url": "",
    "normal_server_url": "",
    "secret_key": "",
    "host_mode": False,
    # False = reachable on the local network only; True = published via ngrok.
    "use_ngrok_with_host": False,
    "host_port": DEFAULT_HOST_PORT,
    "ngrok_public_url": "",
    "start_on_login": False,
    # macOS: keep ClipSync out of the Dock unless one of its windows is open.
    "hide_dock_icon": True,
    "sync_images": True,
    "check_updates": True,
    # "main" for everyone; "preview" is the developer channel.
    "update_channel": "main",
}

UPDATE_CHECK_INTERVAL_SECONDS = 12 * 3600


def image_fingerprint(image: Image.Image) -> str:
    """Identity of an image's pixels, independent of how it was encoded.

    Windows hands back a re-encoded PNG and macOS may hand back TIFF, so a
    hash of the file bytes would treat our own write as a fresh copy.
    """
    rgba = image if image.mode == "RGBA" else image.convert("RGBA")
    digest = hashlib.sha256(repr(rgba.size).encode())
    digest.update(rgba.tobytes())
    return "img:" + digest.hexdigest()


def encode_png(image: Image.Image) -> bytes:
    buf = io.BytesIO()
    image.save(buf, "PNG", compress_level=4)
    return buf.getvalue()


def fit_image_for_wire(image: Image.Image, png: bytes) -> tuple[bytes, str, tuple[int, int], bool] | None:
    """Make an image fit MAX_IMAGE_BYTES.

    Returns (data, mime, (width, height), resized), or None when it cannot fit.
    An image that already fits is returned untouched. Otherwise it is flattened
    onto white and re-encoded as JPEG, then scaled down in steps until it fits.
    """
    if len(png) <= MAX_IMAGE_BYTES:
        return png, "image/png", image.size, False

    rgba = image.convert("RGBA")
    flat = Image.new("RGB", rgba.size, (255, 255, 255))
    flat.paste(rgba, mask=rgba.getchannel("A"))
    for long_edge in (2560, 1920, 1280):
        candidate = flat
        if max(flat.size) > long_edge:
            scale = long_edge / max(flat.size)
            candidate = flat.resize(
                (max(1, round(flat.width * scale)), max(1, round(flat.height * scale))), Image.BILINEAR
            )
        for quality in (85, 75):
            buf = io.BytesIO()
            candidate.save(buf, "JPEG", quality=quality)
            if buf.tell() <= MAX_IMAGE_BYTES:
                return buf.getvalue(), "image/jpeg", candidate.size, True
    return None


def asset_path(filename: str) -> str:
    base = getattr(sys, "_MEIPASS", None)
    if base and os.path.isdir(base):
        candidate = os.path.join(base, "assets", filename)
        if os.path.exists(candidate):
            return candidate
    candidate = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", filename)
    if os.path.exists(candidate):
        return candidate
    return ""


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


def host_port(config: dict) -> int:
    try:
        port = int(config.get("host_port") or DEFAULT_HOST_PORT)
    except (TypeError, ValueError):
        return DEFAULT_HOST_PORT
    return port if 1024 <= port <= 65535 else DEFAULT_HOST_PORT


def local_relay_url(config: dict) -> str:
    return f"ws://127.0.0.1:{host_port(config)}"


def is_local_relay_url(url: str) -> bool:
    return url.startswith("ws://127.0.0.1:")


def host_bind_address(config: dict) -> str:
    # With ngrok the tunnel is the only way in; without it the relay must be
    # reachable from other devices on the network.
    return "127.0.0.1" if config.get("use_ngrok_with_host") else "0.0.0.0"


def lan_address() -> str:
    """This computer's address on the local network (a UDP connect sends no packet)."""
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(("192.0.2.1", 9))
        return probe.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        probe.close()


def port_available(bind: str, port: int) -> bool:
    test = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        test.bind((bind, port))
        return True
    except OSError:
        return False
    finally:
        test.close()


def _ngrok_command(path: str, *args: str) -> list[str]:
    if platform.system() == "Windows" and path.lower().endswith(".ps1"):
        return ["powershell", "-ExecutionPolicy", "Bypass", "-File", path, *args]
    return [path, *args]


def _run_ngrok(path: str, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        _ngrok_command(path, *args),
        capture_output=True,
        text=True,
        timeout=15,
        stdin=subprocess.DEVNULL,
        creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0,
    )


def ngrok_status() -> dict:
    """Whether ngrok is installed and has an authtoken. Never returns the token."""
    path = find_executable("ngrok")
    status = {"installed": bool(path), "version": "", "authenticated": False}
    if not path:
        return status
    try:
        status["version"] = _run_ngrok(path, "version").stdout.strip().replace("ngrok version ", "")
    except Exception as exc:
        logger.warning("ngrok version check failed: %s", exc)
    if os.environ.get("NGROK_AUTHTOKEN"):
        status["authenticated"] = True
        return status
    try:
        output = _run_ngrok(path, "config", "check").stdout
        match = re.search(r"configuration file at (.+)$", output.strip(), re.MULTILINE)
        if match:
            with open(match.group(1).strip(), encoding="utf-8") as config_file:
                status["authenticated"] = any(
                    re.match(r"\s*authtoken\s*:\s*\S+", line) for line in config_file
                )
    except Exception as exc:
        logger.warning("ngrok config check failed: %s", exc)
    return status


def ngrok_add_authtoken(token: str) -> tuple[bool, str]:
    path = find_executable("ngrok")
    if not path:
        return False, "ngrok is not installed"
    try:
        result = _run_ngrok(path, "config", "add-authtoken", token.strip())
    except Exception as exc:
        return False, str(exc)
    if result.returncode != 0:
        return False, (result.stderr or result.stdout).strip()[:200] or "ngrok rejected the token"
    return True, "Authtoken saved"


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


def set_macos_dock_visible(visible: bool, activate: bool = False):
    """Show or hide this process's Dock icon. No-op outside macOS.

    The bundle ships with LSUIElement=true, so every ClipSync process starts
    as a menu-bar-only accessory app; this promotes it to a regular app (Dock
    icon, app menu, Cmd-Tab) or demotes it back at runtime.
    """
    if not _IS_MACOS:
        return
    try:
        from AppKit import (
            NSApplication,
            NSApplicationActivationPolicyAccessory,
            NSApplicationActivationPolicyRegular,
        )
    except ImportError:
        logger.warning("AppKit unavailable; cannot change Dock visibility")
        return

    app = NSApplication.sharedApplication()
    app.setActivationPolicy_(
        NSApplicationActivationPolicyRegular if visible else NSApplicationActivationPolicyAccessory
    )
    if activate:
        app.activateIgnoringOtherApps_(True)


_instance_lock = None


def acquire_single_instance_lock() -> bool:
    """Return False when another ClipSync tray process is already running.

    macOS can start ClipSync twice at login (LaunchAgent plus Login Items, or
    "reopen windows" restoring the previous session), and Windows can too
    (Run key plus a manual launch). The OS drops the lock when the process
    dies, so a crash never leaves a stale lock behind.
    """
    global _instance_lock
    if platform.system() == "Windows":
        import ctypes
        from ctypes import wintypes

        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        kernel32.CreateMutexW.argtypes = [wintypes.LPVOID, wintypes.BOOL, wintypes.LPCWSTR]
        kernel32.CreateMutexW.restype = wintypes.HANDLE
        handle = kernel32.CreateMutexW(None, False, "Local\\ClipSyncTray")
        if not handle:
            return True  # Cannot tell; never block startup over it.
        if ctypes.get_last_error() == 183:  # ERROR_ALREADY_EXISTS
            kernel32.CloseHandle(handle)
            return False
        _instance_lock = handle
        return True

    import fcntl

    os.makedirs(CONFIG_DIR, exist_ok=True)
    lock = open(LOCK_FILE, "a+")
    try:
        fcntl.flock(lock.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        lock.close()
        return False
    _instance_lock = lock
    return True


def launch_arguments(extra_args: list[str] | None = None) -> list[str]:
    args = [sys.executable] if getattr(sys, "frozen", False) else [sys.executable, os.path.abspath(__file__)]
    if extra_args:
        args.extend(extra_args)
    return args


# Same tokens as the iOS app (ios-app/ClipSync/ContentView.swift).
PALETTE = {
    "bg": "#101827",
    "panel": "#182234",
    "panel_border": "#26354C",
    "status_bg": "#102A3D",
    "status_border": "#1C6F94",
    "text": "#E7EEF8",
    "text_secondary": "#95A3B8",
    "label": "#B8C3D4",
    "blue": "#4A90D9",
    "blue_hover": "#3B7BC0",
    "teal": "#00A6A6",
    "green": "#34D399",
    "orange": "#FBBF24",
    "red": "#F87171",
}
STATUS_DOT_COLORS = {
    "green": PALETTE["green"],
    "blue": PALETTE["blue"],
    "orange": PALETTE["orange"],
    "red": PALETTE["red"],
    "gray": PALETTE["text_secondary"],
}


def _preferences_values(device: str, server_url: str, secret: str, startup: bool,
                        host: bool, ngrok: bool, hide_dock: bool, port, sync_images: bool = True,
                        check_updates: bool = True, preview_channel: bool = False) -> dict:
    values = {
        "sync_images": bool(sync_images),
        "check_updates": bool(check_updates),
        "update_channel": "preview" if preview_channel else "main",
        "device_name": device.strip() or "Desktop",
        "normal_server_url": server_url.strip(),
        "secret_key": secret.strip(),
        "start_on_login": bool(startup),
        "host_mode": bool(host),
        "use_ngrok_with_host": bool(ngrok),
        "hide_dock_icon": bool(hide_dock),
        "ngrok_public_url": "",
    }
    values["host_port"] = host_port({"host_port": port})
    values["server_url"] = local_relay_url(values) if host else server_url.strip()
    return values


def show_preferences_dialog(status_color: str = "gray", status_text: str = "") -> bool:
    """Styled preferences window. It runs in its own short-lived process, so
    its UI toolkit costs nothing once the window is closed."""
    try:
        import customtkinter as ctk
    except ImportError:
        logger.warning("customtkinter unavailable; using the basic preferences window")
        return _show_basic_preferences_dialog()

    p = PALETTE
    config = load_config()
    saved = {"value": False}

    ctk.set_appearance_mode("dark")
    root = ctk.CTk(fg_color=p["bg"])
    if platform.system() == "Windows":
        ico = asset_path("clipsync.ico")
        if ico and os.path.exists(ico):
            try:
                root.iconbitmap(ico)
            except Exception:
                pass
    set_macos_dock_visible(True, activate=True)
    root.title("ClipSync Preferences")
    root.resizable(False, False)

    def font(size: int, weight: str = "normal"):
        return ctk.CTkFont(size=size, weight=weight)

    body = ctk.CTkFrame(root, fg_color="transparent")
    body.pack(fill="both", expand=True, padx=24, pady=(18, 20))

    ctk.CTkLabel(body, text="ClipSync", font=font(26, "bold"), text_color=p["text"]).pack()
    ctk.CTkLabel(
        body, text=f"Clipboard sync  \u00b7  v{APP_VERSION}", font=font(13), text_color=p["text_secondary"]
    ).pack(pady=(0, 14))

    def card(bg: str, border: str):
        frame = ctk.CTkFrame(body, fg_color=bg, border_color=border, border_width=1, corner_radius=12)
        frame.pack(fill="x", pady=(0, 14))
        return frame

    def card_title(parent, text: str):
        ctk.CTkLabel(parent, text=text, font=font(15, "bold"), text_color=p["text"], anchor="w").pack(
            fill="x", padx=16, pady=(14, 4)
        )

    status = card(p["status_bg"], p["status_border"])
    status_row = ctk.CTkFrame(status, fg_color="transparent")
    status_row.pack(fill="x", padx=16, pady=12)
    ctk.CTkLabel(
        status_row, text="\u25cf", font=font(16),
        text_color=STATUS_DOT_COLORS.get(status_color, p["text_secondary"]),
    ).pack(side="left", padx=(0, 10))
    ctk.CTkLabel(
        status_row, text=status_text or "Not connected", font=font(14, "bold"), text_color=p["text"], anchor="w"
    ).pack(side="left")

    tabs = ctk.CTkTabview(
        body, height=330, corner_radius=12, fg_color=p["panel"], border_color=p["panel_border"], border_width=1,
        segmented_button_fg_color=p["bg"], segmented_button_selected_color=p["blue"],
        segmented_button_selected_hover_color=p["blue_hover"], segmented_button_unselected_color=p["bg"],
        segmented_button_unselected_hover_color=p["panel_border"], text_color=p["text"],
    )
    tabs.pack(fill="x", pady=(0, 14))
    connection = tabs.add("Connection")
    hosting = tabs.add("Hosting")
    general = tabs.add("General")

    def small(parent, text: str = "", color: str = p["text_secondary"]):
        label = ctk.CTkLabel(parent, text=text, font=font(12), text_color=color, anchor="w",
                             justify="left", wraplength=400)
        label.pack(fill="x", padx=8, pady=(2, 2))
        return label

    def field(parent, label: str, value: str, placeholder: str, show: str = "", width: int = 360):
        ctk.CTkLabel(parent, text=label, font=font(12), text_color=p["label"], anchor="w").pack(
            fill="x", padx=8, pady=(6, 2)
        )
        row = ctk.CTkFrame(parent, fg_color="transparent")
        row.pack(fill="x", padx=8)
        entry = ctk.CTkEntry(
            row, width=width, height=34, corner_radius=8, show=show, placeholder_text=placeholder,
            fg_color=p["bg"], border_color=p["panel_border"], text_color=p["text"],
        )
        entry.pack(side="left", fill="x" if width >= 300 else None, expand=width >= 300)
        if value:
            entry.insert(0, str(value))
        return row, entry

    def switch(parent, text: str, var, command=None):
        widget = ctk.CTkSwitch(
            parent, text=text, variable=var, onvalue=True, offvalue=False, font=font(13),
            # border_width=0 makes the track as tall as the knob; CTk's default
            # leaves the knob overhanging a thinner track.
            switch_width=40, switch_height=22, border_width=0,
            text_color=p["text"], progress_color=p["teal"], fg_color=p["panel_border"],
            button_color=p["text"], button_hover_color="#FFFFFF", command=command,
        )
        widget.pack(anchor="w", padx=8, pady=6)
        return widget

    # --- Connection tab
    _, device_entry = field(connection, "Device name", config.get("device_name", "Desktop"), "My laptop")
    _, server_entry = field(
        connection, "Server URL", config.get("normal_server_url") or config.get("server_url", ""),
        "wss://your-server",
    )
    # Collapses to nothing while empty, so the form has no gap.
    hint_holder = ctk.CTkFrame(connection, fg_color="transparent", height=1)
    hint_holder.pack(fill="x")
    server_hint = small(hint_holder)
    server_hint.pack_forget()
    secret_row, secret_entry = field(
        connection, "Secret key", config.get("secret_key", ""), "Shared secret", show="\u2022"
    )

    def toggle_secret():
        hidden = secret_entry.cget("show") != ""
        secret_entry.configure(show="" if hidden else "\u2022")
        reveal.configure(text="Hide" if hidden else "Show")

    reveal = ctk.CTkButton(
        secret_row, text="Show", width=58, height=34, corner_radius=8, fg_color=p["panel_border"],
        hover_color=p["status_border"], text_color=p["text"], command=toggle_secret,
    )
    reveal.pack(side="left", padx=(8, 0))

    # --- Hosting tab
    host_var = ctk.BooleanVar(value=bool(config.get("host_mode")))
    exposure_var = ctk.StringVar(
        value="ngrok tunnel" if config.get("use_ngrok_with_host") else "Local network"
    )
    small(hosting, "Run the relay on this computer instead of a server. Your other devices connect to it.")
    switch(hosting, "Host the relay on this computer", host_var, command=lambda: refresh_hosting())
    details = ctk.CTkFrame(hosting, fg_color="transparent")
    reach_row = ctk.CTkFrame(details, fg_color="transparent")
    reach_row.pack(fill="x", padx=8, pady=(4, 2))
    ctk.CTkLabel(reach_row, text="Reachable from", font=font(12), text_color=p["label"]).pack(side="left")
    ctk.CTkSegmentedButton(
        reach_row, values=["Local network", "ngrok tunnel"], variable=exposure_var,
        command=lambda _value: refresh_hosting(), selected_color=p["blue"],
        selected_hover_color=p["blue_hover"], unselected_color=p["bg"],
        unselected_hover_color=p["panel_border"], fg_color=p["bg"], text_color=p["text"],
    ).pack(side="left", padx=(10, 0))
    _, port_entry = field(details, "Port", host_port(config), "8000", width=90)
    port_entry.bind("<KeyRelease>", lambda _event: refresh_hosting())
    host_info = small(details, color=p["label"])
    ngrok_box = ctk.CTkFrame(details, fg_color="transparent")
    ngrok_install_label = small(ngrok_box, "Checking ngrok...")
    ngrok_auth_label = small(ngrok_box, "")
    token_row = ctk.CTkFrame(ngrok_box, fg_color="transparent")
    token_entry = ctk.CTkEntry(
        token_row, width=280, height=32, corner_radius=8, show="\u2022",
        placeholder_text="ngrok authtoken (dashboard.ngrok.com)",
        fg_color=p["bg"], border_color=p["panel_border"], text_color=p["text"],
    )
    token_entry.pack(side="left", fill="x", expand=True)
    ngrok_state = {"status": None}

    def save_token():
        token = token_entry.get().strip()
        if not token:
            return
        ngrok_auth_label.configure(text="Saving authtoken...", text_color=p["text_secondary"])

        def work():
            ok, message = ngrok_add_authtoken(token)
            status = ngrok_status()
            root.after(0, lambda: (token_entry.delete(0, "end"), render_ngrok(status, None if ok else message)))

        threading.Thread(target=work, daemon=True).start()

    ctk.CTkButton(
        token_row, text="Save token", width=96, height=32, corner_radius=8, fg_color=p["panel_border"],
        hover_color=p["status_border"], text_color=p["text"], command=save_token,
    ).pack(side="left", padx=(8, 0))

    def render_ngrok(status: dict, error: str | None = None):
        ngrok_state["status"] = status
        if not status["installed"]:
            ngrok_install_label.configure(
                text="\u2717  ngrok is not installed. Get it from ngrok.com/download, then reopen Preferences.",
                text_color=p["red"],
            )
            ngrok_auth_label.configure(text="")
            token_row.pack_forget()
            return
        version = f" ({status['version']})" if status["version"] else ""
        ngrok_install_label.configure(text=f"\u2713  ngrok installed{version}", text_color=p["green"])
        if error:
            ngrok_auth_label.configure(text=f"\u2717  {error}", text_color=p["red"])
        elif status["authenticated"]:
            ngrok_auth_label.configure(text="\u2713  Signed in (authtoken set)", text_color=p["green"])
        else:
            ngrok_auth_label.configure(
                text="\u2717  No authtoken yet. Paste the one from dashboard.ngrok.com:", text_color=p["orange"]
            )
        if status["authenticated"] and not error:
            token_row.pack_forget()
        else:
            token_row.pack(fill="x", padx=8, pady=(2, 4))

    def refresh_hosting():
        hosting_on = bool(host_var.get())
        if hosting_on:
            details.pack(fill="x")
            server_entry.configure(state="disabled", text_color=p["text_secondary"])
            server_hint.configure(text="Hosting is on: this computer connects to its own relay (Hosting tab).")
            server_hint.pack(fill="x", padx=8, pady=(2, 2))
        else:
            details.pack_forget()
            server_entry.configure(state="normal", text_color=p["text"])
            server_hint.pack_forget()
        port = host_port({"host_port": port_entry.get()})
        if exposure_var.get() == "Local network":
            ngrok_box.pack_forget()
            host_info.configure(
                text=(
                    f"Listens on port {port} of every network interface. No third-party service.\n"
                    f"Devices on this network connect to:  ws://{lan_address()}:{port}\n"
                    "Your firewall may ask to allow ClipSync the first time."
                )
            )
        else:
            public = config.get("ngrok_public_url") if config.get("use_ngrok_with_host") else ""
            host_info.configure(
                text=(
                    f"Listens on 127.0.0.1:{port} only; ngrok publishes it on the internet.\n"
                    + (f"Current public address:  {public}" if public
                       else "The public wss:// address is copied to your clipboard when the tunnel is up.")
                )
            )
            ngrok_box.pack(fill="x", pady=(4, 0))

    threading.Thread(target=lambda: (lambda st: root.after(0, lambda: render_ngrok(st)))(ngrok_status()),
                     daemon=True).start()

    # --- General tab
    startup_var = ctk.BooleanVar(value=bool(config.get("start_on_login")))
    hide_dock_var = ctk.BooleanVar(value=bool(config.get("hide_dock_icon", True)))
    images_var = ctk.BooleanVar(value=bool(config.get("sync_images", True)))
    switch(general, "Start ClipSync on login", startup_var)
    switch(general, "Sync images (up to 16 MB)", images_var)
    if _IS_MACOS:
        switch(general, "Hide Dock icon when no window is open", hide_dock_var)
    updates_var = ctk.BooleanVar(value=bool(config.get("check_updates", True)))
    preview_var = ctk.BooleanVar(value=config.get("update_channel", "main") == "preview")
    switch(general, "Check for updates automatically", updates_var)
    switch(general, "Developer: preview updates (preview branch)", preview_var)

    refresh_hosting()
    root.minsize(520, 0)
    if host_var.get():
        tabs.set("Hosting")

    def save_and_close(_event=None):
        config.update(
            _preferences_values(
                device_entry.get(), server_entry.get(), secret_entry.get(), startup_var.get(),
                host_var.get(), exposure_var.get() == "ngrok tunnel", hide_dock_var.get(), port_entry.get(),
                images_var.get(), updates_var.get(), preview_var.get(),
            )
        )
        save_config(config)
        saved["value"] = True
        root.destroy()

    buttons = ctk.CTkFrame(body, fg_color="transparent")
    buttons.pack(fill="x", pady=(2, 0))
    ctk.CTkButton(
        buttons, text="Save & Connect", height=38, corner_radius=10, font=font(14, "bold"),
        fg_color=p["blue"], hover_color=p["blue_hover"], command=save_and_close,
    ).pack(side="right")
    ctk.CTkButton(
        buttons, text="Cancel", width=90, height=38, corner_radius=10, font=font(14),
        fg_color="transparent", border_width=1, border_color=p["panel_border"],
        hover_color=p["panel"], text_color=p["text_secondary"], command=root.destroy,
    ).pack(side="right", padx=(0, 10))

    root.bind("<Return>", save_and_close)
    root.bind("<Escape>", lambda _event: root.destroy())
    root.mainloop()
    return saved["value"]


def _show_basic_preferences_dialog() -> bool:
    import tkinter as tk

    config = load_config()
    root = tk.Tk()
    if platform.system() == "Windows":
        ico = asset_path("clipsync.ico")
        if ico and os.path.exists(ico):
            try:
                root.iconbitmap(ico)
            except Exception:
                pass
    # The preferences window is its own process, so it owns the Dock icon only
    # while it is open and the icon disappears again when it closes.
    set_macos_dock_visible(True, activate=True)
    root.title("ClipSync Preferences")
    root.resizable(False, False)
    root.configure(padx=18, pady=16)

    device_var = tk.StringVar(value=config.get("device_name", "Desktop"))
    server_var = tk.StringVar(value=config.get("normal_server_url") or config.get("server_url", ""))
    secret_var = tk.StringVar(value=config.get("secret_key", ""))
    startup_var = tk.BooleanVar(value=bool(config.get("start_on_login")))
    host_var = tk.BooleanVar(value=bool(config.get("host_mode")))
    ngrok_var = tk.BooleanVar(value=bool(config.get("use_ngrok_with_host")))
    hide_dock_var = tk.BooleanVar(value=bool(config.get("hide_dock_icon", True)))
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
    tk.Checkbutton(root, text="Host the relay on this computer (local network)", variable=host_var).grid(
        row=4, column=0, columnspan=2, sticky="w", pady=2
    )
    tk.Checkbutton(root, text="Publish it with an ngrok tunnel", variable=ngrok_var).grid(
        row=5, column=0, columnspan=2, sticky="w", pady=2
    )
    if _IS_MACOS:
        tk.Checkbutton(
            root, text="Hide Dock icon when no window is open", variable=hide_dock_var
        ).grid(row=6, column=0, columnspan=2, sticky="w", pady=2)

    button_frame = tk.Frame(root)
    button_frame.grid(row=7, column=0, columnspan=2, sticky="e", pady=(16, 0))

    def save_and_close():
        config.update(
            _preferences_values(
                device_var.get(), server_var.get(), secret_var.get(), startup_var.get(),
                host_var.get(), ngrok_var.get(), hide_dock_var.get(), host_port(config),
                bool(config.get("sync_images", True)), bool(config.get("check_updates", True)),
                config.get("update_channel") == "preview",
            )
        )
        save_config(config)
        saved["value"] = True
        root.destroy()

    tk.Button(button_frame, text="Cancel", command=root.destroy).pack(side="right", padx=(8, 0))
    tk.Button(button_frame, text="Save", command=save_and_close).pack(side="right")
    root.mainloop()
    return saved["value"]


_ICON_COLORS = {
    "gray": (125, 136, 150, 255),
    "green": (0, 194, 168, 255),
    "orange": (255, 184, 77, 255),
    "blue": (74, 144, 217, 255),
    "red": (224, 92, 92, 255),
}
_icon_cache: dict[str, Image.Image] = {}


def create_icon_image(color: str) -> Image.Image:
    if color in _icon_cache:
        return _icon_cache[color]
    size = 64
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    fill = _ICON_COLORS.get(color, _ICON_COLORS["gray"])
    draw.rounded_rectangle([6, 6, size - 6, size - 6], radius=14, fill=fill)
    draw.rounded_rectangle([21, 17, 43, 49], radius=3, fill=(255, 255, 255, 230))
    draw.rounded_rectangle([25, 12, 39, 22], radius=3, fill=(255, 255, 255, 230))
    draw.rectangle([26, 29, 38, 32], fill=fill)
    draw.rectangle([26, 37, 38, 40], fill=fill)
    _icon_cache[color] = img
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
        # The tray colour/text are never stored as the "current" state: they are
        # derived from these fields every time (see _current_status), so the
        # icon cannot go stale or disagree with the real connection.
        self.connect_problem: tuple[str, str] | None = None
        self.host_problem: tuple[str, str] | None = None
        self._notice_text = ""
        self._notice_until = 0.0
        self._tray_lock = threading.RLock()
        self.ws_loop: asyncio.AbstractEventLoop | None = None
        self.send_queue: asyncio.Queue | None = None
        self.stop_event = threading.Event()
        self.key: bytes | None = None
        self.server_thread = None
        self.ws_thread: threading.Thread | None = None
        self.ngrok_process: subprocess.Popen | None = None
        self.preferences_open = False
        self.status_color = "gray"
        self.host_lan_address = ""
        self.status_title = "Disconnected"
        # (device, text or image label, PNG bytes for images else None)
        self.recent_clips: "deque[tuple[str, str, bytes | None]]" = deque(maxlen=RECENT_CLIPS_MAX)
        self.last_image_fingerprint = ""
        self.available_update: dict | None = None
        self._update_busy = threading.Lock()
        self._reconnect_lock = threading.Lock()
        self._chunk_buffer: dict[str, dict] = {}

        # Echo suppression.  `_recent_sync_values` holds every payload that has
        # recently been sent or received; `_applying_remote` parks the poller
        # while we write to the OS clipboard.
        self._clip_lock = threading.RLock()
        self._recent_sync_values: "OrderedDict[str, float]" = OrderedDict()
        self._applying_remote = False
        self._last_change_token = clipboard_change_token()

        self.icon = pystray.Icon("ClipSync")
        self.icon.icon = create_icon_image("gray")
        self.icon.title = "ClipSync - Disconnected"
        if platform.system() == "Windows":
            self._setup_windows_shutdown_handler()
        # pystray has created NSApp by now; settle the Dock icon before run().
        self._apply_dock_policy()
        self._refresh_tray()

    def _setup_windows_shutdown_handler(self):
        try:
            import ctypes
            from ctypes import wintypes

            @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.DWORD)
            def ctrl_handler(ctrl_type):
                # 0: CTRL_C, 1: CTRL_BREAK, 2: CTRL_CLOSE, 5: CTRL_LOGOFF, 6: CTRL_SHUTDOWN
                logger.info("Shutdown/Logoff signal received (%d). Stopping ClipSync...", ctrl_type)
                self.is_running = False
                self.stop_event.set()
                return False

            self._ctrl_handler_ref = ctrl_handler
            ctypes.windll.kernel32.SetConsoleCtrlHandler(ctrl_handler, True)
        except Exception as exc:
            logger.warning("Could not register console control handler: %s", exc)

    def _run_on_main_thread(self, fn):
        """Dispatch *fn* to the main thread on macOS.

        macOS 27 enforces that NSStatusItem UI mutations happen on the
        main run-loop queue.  If we are already on the main thread (e.g.
        during __init__) the callback is invoked directly.
        On Windows / Linux this is a no-op wrapper.
        """
        if _IS_MACOS and threading.current_thread() is not threading.main_thread():
            try:
                from PyObjCTools import AppHelper

                AppHelper.callAfter(fn)
                return
            except ImportError:
                pass
        fn()

    def _apply_dock_policy(self):
        if _IS_MACOS:
            hidden = bool(self.config.get("hide_dock_icon", True))
            self._run_on_main_thread(lambda: set_macos_dock_visible(not hidden))

    def _toggle_dock_icon_from_tray(self, icon=None, item=None):
        with self.config_lock:
            self.config["hide_dock_icon"] = not self.config.get("hide_dock_icon", True)
            save_config(self.config)
        self._apply_dock_policy()
        self._rebuild_menu()

    def _build_menu(self):
        """Build and return the tray menu (pure computation, thread-safe)."""
        _color, status = self._current_status()
        items = [
            pystray.MenuItem(f"ClipSync v{APP_VERSION}", None, enabled=False),
            pystray.MenuItem(f"Status: {status}", None, enabled=False),
        ]
        notice = self._current_notice()
        if notice:
            items.append(pystray.MenuItem(notice, None, enabled=False))
        items.append(self._recent_clips_item())

        items.extend(
            [
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Preferences...", self._open_preferences_from_tray),
                self._update_menu_item(),
            ]
        )
        if _IS_MACOS:
            items.append(
                pystray.MenuItem(
                    "Show Dock Icon",
                    self._toggle_dock_icon_from_tray,
                    checked=lambda item: not self.config.get("hide_dock_icon", True),
                )
            )
        items.extend(
            [
                pystray.Menu.SEPARATOR,
                pystray.MenuItem(
                    "Connect" if not self.is_connected else "Disconnect",
                    self._toggle_connection,
                ),
                pystray.Menu.SEPARATOR,
                pystray.MenuItem("Quit", self._quit),
            ]
        )
        return pystray.Menu(*items)

    def _recent_clips_item(self):
        clips = list(self.recent_clips)
        if not clips:
            return pystray.MenuItem("Recent clips: none", None, enabled=False)
        entries = []
        for device, content, png in reversed(clips):
            label = content if png else textwrap.shorten(" ".join(content.split()), width=40, placeholder="...")
            entries.append(pystray.MenuItem(f"{label}  \u2014 {device}", self._make_recopy_action(content, png)))
        return pystray.MenuItem("Recent clips", pystray.Menu(*entries))

    def _make_recopy_action(self, content: str, png: bytes | None = None):
        def _recopy(icon, item):
            # Copying it back counts as a fresh local copy, so the poller syncs it.
            if png:
                image = Image.open(io.BytesIO(png))
                threading.Thread(target=set_clipboard_image, args=(png, image), daemon=True).start()
            else:
                threading.Thread(target=set_clipboard, args=(content,), daemon=True).start()

        return _recopy

    def _remember_recent_clip(self, device: str, content: str, png: bytes | None = None):
        for entry in list(self.recent_clips):
            if entry[1] == content and entry[2] == png:
                self.recent_clips.remove(entry)
        self.recent_clips.append((device, content, png))
        images = [entry for entry in self.recent_clips if entry[2]]
        for entry in images[:-RECENT_IMAGES_MAX]:
            self.recent_clips.remove(entry)

    def _current_status(self) -> tuple[str, str]:
        """(icon colour, status text), derived from live state on every call.

        Priority: a hosting problem, then the real connection (blue "Hosting"
        when this computer runs the relay, green "Connected" otherwise), then
        a connection problem, then "Connecting..." while the socket thread is
        starting, else grey "Disconnected".
        """
        hosting = bool(self.config.get("host_mode"))
        if hosting and self.host_problem:
            return self.host_problem
        if self.is_connected:
            return ("blue", "Hosting") if hosting else ("green", "Connected")
        if self.connect_problem:
            return self.connect_problem
        thread = self.ws_thread
        if thread is not None and thread.is_alive() and not self.stop_event.is_set():
            return "orange", "Connecting..."
        return "gray", "Disconnected"

    def _current_notice(self) -> str:
        return self._notice_text if time.monotonic() < self._notice_until else ""

    def _set_notice(self, text: str, seconds: float = 60.0):
        """A short informational line under Status (update found, image resized...).
        It never replaces the connection status."""
        self.status_message = text
        self._notice_text = text
        self._notice_until = time.monotonic() + seconds
        self._refresh_tray()
        timer = threading.Timer(seconds + 0.5, self._refresh_tray)
        timer.daemon = True
        timer.start()

    def _refresh_tray(self):
        """Re-render icon, tooltip and menu from the current state.

        The state is read inside the callback, under a lock, on the tray's main
        thread. Two threads reporting changes at once therefore can never apply
        an older snapshot after a newer one.
        """
        if not hasattr(self, "_tray_lock") or not hasattr(self, "icon") or self.icon is None:
            return

        def _apply():
            with self._tray_lock:
                color, text = self._current_status()
                if color != self.status_color or self.icon.icon is None:
                    self.icon.icon = create_icon_image(color)
                self.status_color, self.status_title = color, text
                self.icon.title = f"ClipSync - {text}"
                self.icon.menu = self._build_menu()

        self._run_on_main_thread(_apply)

    def _rebuild_menu(self):
        self._refresh_tray()

    def _open_preferences_from_tray(self, icon=None, item=None):
        self.open_preferences()

    def open_preferences(self):
        if self.preferences_open:
            return

        def _run_preferences_process():
            self.preferences_open = True
            try:
                status_color, status_text = self._current_status()
                process = subprocess.Popen(
                    launch_arguments(
                        [
                            "--preferences",
                            "--status-color",
                            status_color,
                            "--status-text",
                            status_text,
                        ]
                    ),
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
        self._apply_dock_policy()
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
                if normal_url and not is_local_relay_url(normal_url):
                    self.config["normal_server_url"] = normal_url
                self.config["server_url"] = local_relay_url(self.config)
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

    def _enable_host_mode(self, reconnect: bool = True):
        with self.config_lock:
            if self.config.get("server_url") and not is_local_relay_url(self.config["server_url"]):
                self.config["normal_server_url"] = self.config["server_url"]
            self.config["host_mode"] = True
            self.config["server_url"] = local_relay_url(self.config)
            save_config(self.config)

        if not self._start_host():
            return
        self.host_problem = None
        if self.config.get("use_ngrok_with_host"):
            self._start_ngrok()
        else:
            self._stop_ngrok()
        self._refresh_tray()
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
        self.host_problem = None
        self._refresh_tray()
        if reconnect:
            self._reconnect_if_configured()

    def _start_host(self) -> bool:
        port = host_port(self.config)
        bind = host_bind_address(self.config)
        if self.server_thread and self.server_thread.is_alive:
            if (self.server_thread.host, self.server_thread.port) == (bind, port):
                return True
            self._stop_host()
        if not port_available(bind, port):
            logger.error("Hosting: port %s is already in use", port)
            self.host_problem = ("red", f"Port {port} is already in use")
            self._refresh_tray()
            return False
        try:
            from host_server import start_host_server  # slow import; only when hosting

            self.server_thread = start_host_server(host=bind, port=port)
            self.host_lan_address = lan_address()
            logger.info("Hosting relay on %s:%s", bind, port)
            return True
        except Exception as exc:
            logger.error("Could not start hosting: %s", exc)
            self.host_problem = ("red", f"Host error: {exc}")
            self._refresh_tray()
            return False

    def _stop_host(self):
        if self.server_thread:
            self.server_thread.stop()
            self.server_thread = None

    def _start_ngrok(self):
        # The status checks shell out to ngrok; keep them off the tray thread.
        threading.Thread(target=self._start_ngrok_worker, daemon=True).start()

    def _start_ngrok_worker(self):
        if self.ngrok_process and self.ngrok_process.poll() is None:
            return

        status = ngrok_status()
        problem = ""
        if not status["installed"]:
            problem = "ngrok is not installed"
        elif not status["authenticated"]:
            problem = "no ngrok authtoken (Preferences > Hosting)"
        if problem:
            logger.warning("Cannot start ngrok: %s", problem)
            self.host_problem = ("orange", problem)
            self._refresh_tray()
            return
        self.host_problem = None

        cmd = _ngrok_command(find_executable("ngrok"), "http", str(host_port(self.config)))

        try:
            self.ngrok_process = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if platform.system() == "Windows" else 0,
            )
        except Exception as exc:
            self.host_problem = ("orange", f"ngrok failed: {exc}")
            self._refresh_tray()
            logger.warning("Could not start ngrok: %s", exc)
            return

        threading.Thread(target=self._wait_for_ngrok_url, daemon=True).start()

    def _wait_for_ngrok_url(self):
        for _ in range(30):
            if self.ngrok_process is None or self.ngrok_process.poll() is not None:
                self.host_problem = ("orange", "ngrok exited (check its authtoken)")
                self._refresh_tray()
                return
            url = self._read_ngrok_url()
            if url:
                with self.config_lock:
                    self.config["ngrok_public_url"] = url
                    save_config(self.config)
                self._remember_sync_value(url)
                self.last_clipboard = url
                set_clipboard(url)
                self._last_change_token = clipboard_change_token()
                self.host_problem = None
                self._set_notice("ngrok tunnel ready")
                logger.info("ngrok mobile URL: %s", url)
                return
            time.sleep(0.5)
        self.host_problem = ("orange", "ngrok tunnel not ready")
        self._refresh_tray()

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
            # Goes through the worker so a still-closing previous socket is
            # waited for instead of the click silently doing nothing.
            self._reconnect_if_configured()

    def _connect(self):
        with self.config_lock:
            server_url = self.config.get("server_url", "")
            secret_key = self.config.get("secret_key", "")

        if not server_url or not secret_key:
            self.connect_problem = ("orange", "Open Preferences")
            self._refresh_tray()
            logger.error("Cannot connect: server_url or secret_key not set")
            return

        if self.ws_thread and self.ws_thread.is_alive():
            return

        self.stop_event.clear()
        self.connect_problem = None
        self.key = derive_key(secret_key)
        self.ws_thread = threading.Thread(target=self._ws_thread, daemon=True)
        self.ws_thread.start()
        self._refresh_tray()

    def _disconnect(self):
        self.stop_event.set()
        self.is_connected = False
        self.connect_problem = None
        self._refresh_tray()

    def _reconnect_if_configured(self):
        # Waiting for the old socket to close can take a few seconds; never do
        # that on the tray's (main) thread.
        threading.Thread(target=self._reconnect_worker, daemon=True).start()

    def _reconnect_worker(self):
        with self._reconnect_lock:
            old_thread = self.ws_thread
            self._disconnect()
            if old_thread and old_thread.is_alive():
                old_thread.join(timeout=8)
                if old_thread.is_alive():
                    logger.warning("Previous connection did not stop in time; skipping reconnect")
                    return
            self._connect()

    async def _sleep_unless_stopped(self, seconds: float):
        deadline = time.monotonic() + seconds
        while not self.stop_event.is_set() and time.monotonic() < deadline:
            await asyncio.sleep(0.2)

    def _ws_thread(self):
        self.ws_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.ws_loop)
        self.send_queue = asyncio.Queue()
        try:
            self.ws_loop.run_until_complete(self._ws_client_loop())
        except Exception as exc:
            logger.error("WS thread crashed: %s", exc)
        finally:
            # A superseded thread must not touch the state of its successor.
            if self.ws_thread is threading.current_thread():
                self.is_connected = False
                self.ws_thread = None
            self._refresh_tray()

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

        retry_delay = RECONNECT_MIN_SECONDS
        while not self.stop_event.is_set():
            try:
                async with websockets.connect(
                    ws_url,
                    ssl=ssl_context,
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=5,
                    # websockets refuses incoming messages over 1 MiB by default.
                    max_size=WS_MAX_MESSAGE_BYTES,
                ) as ws:
                    if self.stop_event.is_set():
                        break
                    connected_at = time.monotonic()
                    self.is_connected = True
                    self.connect_problem = None
                    self._refresh_tray()
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
                    for task in done:
                        if not task.cancelled() and task.exception():
                            logger.warning("Connection ended: %s", task.exception())

                # The socket closed without an exception (server closed it, or
                # the receive loop ended). It is NOT connected any more: say so
                # now instead of showing "Connected" through the whole retry.
                self.is_connected = False
                if self.stop_event.is_set():
                    break
                if time.monotonic() - connected_at > 30:
                    retry_delay = RECONNECT_MIN_SECONDS
                logger.warning("Connection closed. Reconnecting in %.0fs...", retry_delay)
                self.connect_problem = ("orange", f"Reconnecting in {retry_delay:.0f}s...")
                self._refresh_tray()
                await self._sleep_unless_stopped(retry_delay)
                retry_delay = min(retry_delay * 2, RECONNECT_MAX_SECONDS)
            except Exception as exc:
                self.is_connected = False
                if self.stop_event.is_set():
                    break
                logger.warning("Connection failed: %s. Retrying in %.0fs...", exc, retry_delay)
                self.connect_problem = ("orange", f"Reconnecting in {retry_delay:.0f}s...")
                self._refresh_tray()
                await self._sleep_unless_stopped(retry_delay)
                retry_delay = min(retry_delay * 2, RECONNECT_MAX_SECONDS)

        self.is_connected = False

    # ------------------------------------------------------------------
    # Echo suppression helpers
    # ------------------------------------------------------------------

    def _prune_sync_values(self, now: float):
        """Drop expired entries. Caller must hold `_clip_lock`."""
        expired = [
            value
            for value, stamp in self._recent_sync_values.items()
            if now - stamp > SYNC_ECHO_TTL_SECONDS
        ]
        for value in expired:
            self._recent_sync_values.pop(value, None)
        while len(self._recent_sync_values) > SYNC_ECHO_MAX_ENTRIES:
            self._recent_sync_values.popitem(last=False)

    def _remember_sync_value(self, value: str):
        """Mark *value* as already synced so we never rebroadcast it."""
        if not value:
            return
        now = time.monotonic()
        with self._clip_lock:
            self._recent_sync_values[value] = now
            self._recent_sync_values.move_to_end(value)
            self._prune_sync_values(now)

    def _is_recent_sync_value(self, value: str) -> bool:
        if not value:
            return False
        now = time.monotonic()
        with self._clip_lock:
            self._prune_sync_values(now)
            return value in self._recent_sync_values

    def _apply_remote_clipboard(self, content: str):
        """Write remote *content* to the local clipboard without echoing it.

        The poller runs on another thread, so we park it for the duration of
        the write.  Without this, the poller can read the *old* clipboard after
        `last_clipboard` has already been moved to the new value, decide the
        clipboard changed, and ship the stale text straight back to the room.
        That race is what made macOS bounce text around: `pbcopy` takes tens of
        milliseconds where the Win32 path takes microseconds.
        """
        with self._clip_lock:
            self._applying_remote = True
        self._remember_sync_value(content)

        try:
            # A Finder/Explorer file copy also carries a text flavour. Writing
            # plain text back over it would destroy the file references and the
            # user would paste file *names* instead of the files themselves.
            if clipboard_has_files() and get_clipboard() == content:
                logger.info("Clipboard holds files with identical text; not overwriting")
                return

            set_clipboard(content)

            # Read back what the OS actually stored instead of assuming it
            # matches `content` - pasteboards may normalise line endings, and a
            # mismatch here would look like a fresh local copy to the poller.
            settled = ""
            for _ in range(15):
                time.sleep(0.02)
                settled = get_clipboard()
                if settled:
                    break

            with self._clip_lock:
                self.last_clipboard = settled or content
                self._last_change_token = clipboard_change_token()
            if settled and settled != content:
                self._remember_sync_value(settled)
        finally:
            with self._clip_lock:
                self._applying_remote = False

    def _apply_remote_image(self, payload: dict, device: str):
        data = decode_image(payload)
        if not data:
            logger.warning("Dropped a damaged image from %s", device)
            return
        try:
            image = Image.open(io.BytesIO(data))
            image.load()
        except Exception as exc:
            logger.warning("Could not decode image from %s: %s", device, exc)
            return

        fingerprint = image_fingerprint(image)
        png = data if payload.get("mime") == "image/png" else encode_png(image)
        with self._clip_lock:
            self._applying_remote = True
        self._remember_sync_value(fingerprint)
        try:
            set_clipboard_image(png, image)
            time.sleep(0.05)
            with self._clip_lock:
                self.last_image_fingerprint = fingerprint
                self.last_clipboard = ""
                self._last_change_token = clipboard_change_token()
        finally:
            with self._clip_lock:
                self._applying_remote = False

        label = f"[Image {image.width}\u00d7{image.height}]"
        logger.info("Received image from %s: %sx%s, %d bytes", device, image.width, image.height, len(data))
        self.last_received_device = device
        self.last_received_content = label
        self._remember_recent_clip(device, label, png)

    def _send_local_image(self):
        image = get_clipboard_image()
        if image is None:
            return
        fingerprint = image_fingerprint(image)
        if fingerprint == self.last_image_fingerprint or self._is_recent_sync_value(fingerprint):
            # Our own write, or something already synced: adopt it silently.
            self.last_image_fingerprint = fingerprint
            return
        self.last_image_fingerprint = fingerprint
        self.last_clipboard = ""

        png = encode_png(image)
        label = f"[Image {image.width}\u00d7{image.height}]"
        fitted = fit_image_for_wire(image, png)
        if fitted is None:
            logger.info("Image not synced: %.1f MB cannot be shrunk under %d MB", len(png) / 1e6, MAX_IMAGE_BYTES // 2**20)
            self._set_notice(f"Image too large to sync ({len(png) / 1e6:.1f} MB)")
            return
        data, mime, (sent_w, sent_h), resized = fitted
        if resized:
            logger.info("Image resized to fit: %.1f MB PNG -> %.1f MB %s (%sx%s)",
                        len(png) / 1e6, len(data) / 1e6, mime, sent_w, sent_h)
            self._set_notice("Image resized to fit")

        self.last_received_device = self.config.get("device_name", "Desktop")
        self.last_received_content = label
        self._remember_recent_clip("this computer", label, png)
        self._refresh_tray()

        if self.is_connected and self.send_queue and self.ws_loop:
            self._remember_sync_value(fingerprint)
            payload = encrypt_image_payload(
                self.config["device_name"], data, mime, sent_w, sent_h, self.key
            )
            asyncio.run_coroutine_threadsafe(self.send_queue.put(payload), self.ws_loop)
            logger.info("Sent image %sx%s (%d bytes)", sent_w, sent_h, len(data))

    async def _receive_loop(self, ws):
        async for message in ws:
            try:
                if message.startswith("cs_chunk:v1:"):
                    parts = message.split(":", 5)
                    if len(parts) == 6:
                        _, _, msg_id, idx_str, total_str, chunk_str = parts
                        idx = int(idx_str)
                        total = int(total_str)
                        now = time.time()
                        self._chunk_buffer = {
                            k: v for k, v in self._chunk_buffer.items() if now - v.get("time", 0) < 60
                        }
                        entry = self._chunk_buffer.setdefault(msg_id, {"total": total, "chunks": {}, "time": now})
                        entry["chunks"][idx] = chunk_str
                        entry["time"] = now
                        if len(entry["chunks"]) == total:
                            message = "".join(entry["chunks"][i] for i in range(total))
                            del self._chunk_buffer[msg_id]
                        else:
                            continue
                    else:
                        continue

                payload = decrypt_payload(message, self.key)
                device = payload.get("device_name", "Unknown")

                if payload.get("type") == "image":
                    if self.config.get("sync_images", True):
                        await asyncio.to_thread(self._apply_remote_image, payload, device)
                        self._rebuild_menu()
                    continue

                content = payload.get("content", "")

                if not content:
                    continue

                logger.info("Received from %s: %s...", device, content[:40])
                self.last_received_device = device
                self.last_received_content = content
                self._remember_recent_clip(device, content)

                # Blocking clipboard work must not stall the websocket loop.
                await asyncio.to_thread(self._apply_remote_clipboard, content)
                self._rebuild_menu()
            except Exception as exc:
                logger.error("Decrypt/receive error: %s", exc)

    async def _send_loop(self, ws):
        CHUNK_SIZE = 512 * 1024
        while not self.stop_event.is_set():
            try:
                message = await asyncio.wait_for(self.send_queue.get(), timeout=1.0)
                if len(message) <= CHUNK_SIZE:
                    await ws.send(message)
                else:
                    msg_id = uuid.uuid4().hex[:12]
                    total = (len(message) + CHUNK_SIZE - 1) // CHUNK_SIZE
                    logger.info("Sending chunked message %s: %d bytes in %d chunks", msg_id, len(message), total)
                    for idx in range(total):
                        chunk = message[idx * CHUNK_SIZE : (idx + 1) * CHUNK_SIZE]
                        await ws.send(f"cs_chunk:v1:{msg_id}:{idx}:{total}:{chunk}")
            except asyncio.TimeoutError:
                continue
            except Exception as exc:
                logger.error("Send error: %s", exc)
                break

    def _poll_clipboard(self):
        try:
            self.last_clipboard = get_clipboard()
            self._last_change_token = clipboard_change_token()
        except Exception:
            pass

        while self.is_running:
            try:
                with self._clip_lock:
                    applying = self._applying_remote
                if applying:
                    # A remote update is landing; re-reading now would race it.
                    time.sleep(0.05)
                    continue

                # Cheap early-out: if the OS exposes a change counter and it
                # has not moved, nothing was copied since the last pass.
                token = clipboard_change_token()
                if token is not None and token == self._last_change_token:
                    time.sleep(0.25)
                    continue
                self._last_change_token = token

                if clipboard_has_files():
                    # A Finder/Explorer file copy. Its text flavour is just the
                    # file names; syncing that (or offering it in Recent clips)
                    # turns the copy into plain text, so leave files alone.
                    self.last_clipboard = ""
                    logger.info("File copy left alone (not synced)")
                    time.sleep(0.25)
                    continue

                current = get_clipboard()
                if not current:
                    # Text always wins: copying Excel cells also publishes a
                    # picture of them, and that must sync as text.
                    if self.config.get("sync_images", True) and clipboard_has_image():
                        self._send_local_image()
                    time.sleep(0.25)
                    continue
                if current == self.last_clipboard:
                    time.sleep(0.25)
                    continue

                if self._is_recent_sync_value(current):
                    # This is content we just sent or just received. Adopt it
                    # silently so it does not ping-pong around the room.
                    self.last_clipboard = current
                    time.sleep(0.25)
                    continue

                self.last_clipboard = current
                self.last_received_device = self.config.get("device_name", "Desktop")
                self.last_received_content = current
                self._remember_recent_clip("this computer", current)
                self._rebuild_menu()

                if self.is_connected and self.send_queue and self.ws_loop:
                    self._remember_sync_value(current)
                    payload = encrypt_payload(
                        self.config["device_name"],
                        current,
                        self.key,
                    )
                    asyncio.run_coroutine_threadsafe(self.send_queue.put(payload), self.ws_loop)
                    logger.info("Sent: %s...", current[:40])
            except Exception:
                pass
            time.sleep(0.25)

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

    # ------------------------------------------------------------------
    # Updates
    # ------------------------------------------------------------------

    def _update_menu_item(self):
        if self.available_update:
            channel = " (preview)" if self.available_update["channel"] == "preview" else ""
            return pystray.MenuItem(
                f"Install update {self.available_update['version']}{channel}", self._install_update_from_tray
            )
        return pystray.MenuItem("Check for updates", self._check_updates_from_tray)

    def _check_updates_from_tray(self, icon=None, item=None):
        threading.Thread(target=self._check_for_update, kwargs={"manual": True}, daemon=True).start()

    def _check_for_update(self, manual: bool = False):
        if not self._update_busy.acquire(blocking=False):
            return
        try:
            if updater.install_root() is None:
                if manual:
                    self._set_notice("Updates only work in the installed app")
                return
            channel = self.config.get("update_channel", "main")
            update = updater.check(APP_VERSION, channel)
            self.available_update = update
            if update:
                logger.info("Update available on %s: %s", channel, update["version"])
                self._set_notice(f"Update {update['version']} available", seconds=3600)
            elif manual:
                self._set_notice(f"Up to date (v{APP_VERSION})", seconds=15)
        except updater.UpdateError as exc:
            logger.warning("%s", exc)
            if manual:
                self._set_notice("Update check failed", seconds=15)
        finally:
            self._update_busy.release()

    def _update_loop(self):
        # A small JSON fetch at startup and twice a day; nothing is downloaded
        # until the user picks "Install update".
        deadline = time.monotonic() + 30
        while self.is_running:
            if time.monotonic() >= deadline:
                if self.config.get("check_updates", True):
                    self._check_for_update()
                deadline = time.monotonic() + UPDATE_CHECK_INTERVAL_SECONDS
            time.sleep(5)

    def _install_update_from_tray(self, icon=None, item=None):
        threading.Thread(target=self._install_update, daemon=True).start()

    def _install_update(self):
        update = self.available_update
        root = updater.install_root()
        if not update or root is None or not self._update_busy.acquire(blocking=False):
            return
        try:
            self._set_notice(f"Downloading {update['version']}...", seconds=600)
            package = updater.download(update)
            self._set_notice("Installing update...", seconds=600)
            updater.apply(package, root, os.getpid())
        except updater.UpdateError as exc:
            logger.error("Update failed: %s", exc)
            self._set_notice(str(exc))
            return
        finally:
            self._update_busy.release()
        logger.info("Update %s staged; restarting", update["version"])
        self._run_on_main_thread(self._quit)

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
        threading.Thread(target=self._update_loop, daemon=True).start()
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


def _arg_value(flag: str, default: str = "") -> str:
    try:
        return sys.argv[sys.argv.index(flag) + 1]
    except (ValueError, IndexError):
        return default


if __name__ == "__main__":
    if "--preferences" in sys.argv:
        configure_file_logging()
        try:
            saved = show_preferences_dialog(_arg_value("--status-color", "gray"), _arg_value("--status-text"))
        except Exception:
            logger.exception("Preferences dialog crashed")
            raise
        raise SystemExit(0 if saved else 1)

    if not acquire_single_instance_lock():
        configure_file_logging()
        logger.info("ClipSync is already running; this second launch exits")
        raise SystemExit(0)

    ClipSyncApp().run()
