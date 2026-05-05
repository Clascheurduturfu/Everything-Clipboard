import rumps
import asyncio
import threading
import pyperclip
import websockets
import hashlib
import json
import os
import time
import textwrap

from crypto import derive_key, encrypt_payload, decrypt_payload
import server

CONFIG_FILE = os.path.expanduser("~/.clipsync.json")

class ClipSyncApp(rumps.App):
    def __init__(self):
        super(ClipSyncApp, self).__init__("📋") # Default Offline Icon
        
        self.device_name = "MacBook"
        self.server_url = "ws://127.0.0.1:8000"
        self.secret_key = "my_super_secret_key"
        self.host_mode = False
        
        self.load_config()
        
        self.is_connected = False
        self.ws_loop = None
        self.ws_thread = None
        self.stop_event = threading.Event()
        self.last_clipboard = pyperclip.paste()
        self.send_queue = None
        self.server_thread = None

        # --- Build native macOS menu ---
        self.status_item = rumps.MenuItem("Status: Disconnected")
        
        self.host_item = rumps.MenuItem(
            "Host Mode: ON (Port 8000)" if self.host_mode else "Host Mode: OFF", 
            callback=self.toggle_host_mode
        )
        
        # Last Copied UI Items
        self.last_copied_title = rumps.MenuItem("Last Copied:")
        self.last_copied_title.set_callback(None) # Make it unclickable (just a label)
        self.last_copied_content = rumps.MenuItem("Empty")
        self.last_copied_device = rumps.MenuItem("(None)")
        
        self.connect_item = rumps.MenuItem("Connect", callback=self.connect)
        self.disconnect_item = rumps.MenuItem("Disconnect", callback=self.disconnect)
        self.prefs_item = rumps.MenuItem("Preferences...", callback=self.preferences)
        
        self.menu = [
            self.status_item,
            self.host_item,
            None, # Separator
            self.last_copied_title,
            self.last_copied_content,
            self.last_copied_device,
            None,
            self.connect_item,
            self.disconnect_item,
            None,
            self.prefs_item
        ]
        
        # Initialize UI with current clipboard
        self.update_last_copied_ui(self.device_name, self.last_clipboard)

        # Start clipboard polling thread
        self.poll_thread = threading.Thread(target=self.poll_clipboard, daemon=True)
        self.poll_thread.start()
        
        # Start server if Host Mode is remembered as ON
        if self.host_mode:
            self._start_host_server()

    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    config = json.load(f)
                    self.device_name = config.get("device_name", self.device_name)
                    self.server_url = config.get("server_url", self.server_url)
                    self.secret_key = config.get("secret_key", self.secret_key)
                    self.host_mode = config.get("host_mode", self.host_mode)
            except:
                pass

    def save_config(self):
        with open(CONFIG_FILE, "w") as f:
            json.dump({
                "device_name": self.device_name,
                "server_url": self.server_url,
                "secret_key": self.secret_key,
                "host_mode": self.host_mode
            }, f)

    def preferences(self, _):
        window = rumps.Window(
            message="Enter: Device Name, Server URL, Secret Key (comma separated):\nExample: MacBook,ws://100.x.y.z:8000,secret123", 
            title="Preferences", 
            default_text=f"{self.device_name},{self.server_url},{self.secret_key}"
        )
        response = window.run()
        if response.clicked:
            parts = response.text.split(",", 2)
            if len(parts) >= 3:
                self.device_name = parts[0].strip()
                self.server_url = parts[1].strip()
                self.secret_key = parts[2].strip()
                self.save_config()
                rumps.notification("ClipSync", "Preferences Saved", "Please reconnect to apply changes.")

    def toggle_host_mode(self, _):
        self.host_mode = not self.host_mode
        self.save_config()
        if self.host_mode:
            self._start_host_server()
        else:
            rumps.notification("ClipSync", "Host Mode Disabled", "Restart app to completely stop server.")
            self.host_item.title = "Host Mode: OFF"

    def _start_host_server(self):
        if self.server_thread and self.server_thread.is_alive():
            return
        self.host_item.title = "Host Mode: ON (Port 8000)"
        self.server_thread = threading.Thread(target=server.run_server, args=(8000,), daemon=True)
        self.server_thread.start()

    def update_last_copied_ui(self, device: str, content: str):
        if content:
            display_text = textwrap.shorten(content, width=40, placeholder="...")
            self.last_copied_content.title = f'"{display_text}"'
            self.last_copied_device.title = f"(from {device})"
        else:
            self.last_copied_content.title = "Empty"
            self.last_copied_device.title = "(None)"

    def connect(self, _):
        if self.is_connected:
            return
        self.stop_event.clear()
        self.ws_thread = threading.Thread(target=self.start_ws_loop, daemon=True)
        self.ws_thread.start()

    def disconnect(self, _):
        self.stop_event.set()
        self.set_disconnected_ui()

    def set_connected_ui(self):
        self.is_connected = True
        self.title = "🟢"
        self.status_item.title = "Status: Connected"

    def set_disconnected_ui(self):
        self.is_connected = False
        self.title = "📋"
        self.status_item.title = "Status: Disconnected"

    def start_ws_loop(self):
        self.ws_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.ws_loop)
        self.send_queue = asyncio.Queue()
        self.ws_loop.run_until_complete(self.ws_client_task())
        
    async def ws_client_task(self):
        room_id = hashlib.sha256(self.secret_key.encode('utf-8')).hexdigest()
        
        url = self.server_url
        if url.endswith('/'):
            url = url[:-1]
        ws_url = f"{url}/ws/{room_id}"
        key = derive_key(self.secret_key)
        
        while not self.stop_event.is_set():
            try:
                async with websockets.connect(ws_url) as ws:
                    self.set_connected_ui()
                    
                    receive_task = asyncio.create_task(self.receive_loop(ws, key))
                    send_task = asyncio.create_task(self.send_loop(ws))
                    
                    done, pending = await asyncio.wait(
                        [receive_task, send_task],
                        return_when=asyncio.FIRST_COMPLETED
                    )
                    for task in pending:
                        task.cancel()
            except Exception as e:
                print(f"WS Error: {e}")
                self.set_disconnected_ui()
                await asyncio.sleep(3)
        self.set_disconnected_ui()
            
    async def receive_loop(self, ws, key):
        while not self.stop_event.is_set():
            try:
                message = await ws.recv()
                payload = decrypt_payload(message, key)
                
                content = payload.get("content", "")
                device = payload.get("device_name", "Unknown Device")
                
                # Update clipboard and update memory to prevent Echo Loop
                self.last_clipboard = content
                pyperclip.copy(content)
                
                # Update UI
                self.update_last_copied_ui(device, content)
                
            except Exception as e:
                print(f"Receive error: {e}")
                break

    async def send_loop(self, ws):
        while not self.stop_event.is_set():
            try:
                message = await asyncio.wait_for(self.send_queue.get(), timeout=1.0)
                await ws.send(message)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Send error: {e}")
                break

    def poll_clipboard(self):
        while True:
            try:
                current = pyperclip.paste()
                if current != self.last_clipboard and current != "":
                    self.last_clipboard = current
                    
                    # Update UI for our own local copy
                    self.update_last_copied_ui(self.device_name, current)
                    
                    if self.is_connected and self.send_queue and self.ws_loop:
                        key = derive_key(self.secret_key)
                        payload = encrypt_payload(self.device_name, current, key)
                        asyncio.run_coroutine_threadsafe(self.send_queue.put(payload), self.ws_loop)
            except Exception as e:
                pass
            time.sleep(0.5)

if __name__ == "__main__":
    app = ClipSyncApp()
    app.run()
