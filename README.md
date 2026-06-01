# 📋 Everything Clipboard

[![Release](https://img.shields.io/github/v/release/Clascheurduturfu/Everything-Clipboard?style=for-the-badge&color=7C3AED)](https://github.com/Clascheurduturfu/Everything-Clipboard/releases)
[![Platforms](https://img.shields.io/badge/platforms-Android%20%7C%20Windows%20%7C%20macOS-blue?style=for-the-badge&color=2563EB)](https://github.com/Clascheurduturfu/Everything-Clipboard)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge&color=059669)](https://github.com/Clascheurduturfu/Everything-Clipboard)
[![Security](https://img.shields.io/badge/security-AES--256--GCM-orange?style=for-the-badge&color=D97706)](https://github.com/Clascheurduturfu/Everything-Clipboard#security-architecture)

**Everything Clipboard** is a secure, cross-platform, self-hostable utility that instantly synchronizes your clipboard across **Android, Windows, and macOS** devices. 

No third-party cloud. No unencrypted text. Just copy on one device, and paste on another instantly.

---

## ✨ Features

- **Instant Syncing**: Real-time synchronization powered by WebSockets.
- **Client-Side Encryption**: Your clipboard content is encrypted *before* it leaves your device. The relay server only sees encrypted gibberish.
- **Cross-Platform**: Sleek system tray application for macOS and Windows, paired with a robust background service on Android.
- **Zero-Config Local Mode**: Run the desktop client in **Host Mode** to run a local relay server directly on your machine.
- **Quick Settings Tile (Android)**: Toggle the clipboard synchronization on/off directly from your Android notification drawer.
- **Sensible Privacy (Android)**: Automatically marks incoming synchronized clips as sensitive content, preventing keyboard caching and secure-field leakage.

---

## 🔒 Security Architecture

Everything Clipboard uses a zero-trust model:
1. **Passphrase Derivation**: Your connection key is hashed locally using **PBKDF2 with 200,000 iterations** to generate a cryptographically strong 256-bit AES key.
2. **Encryption**: Payloads are encrypted client-side using **AES-256-GCM**.
3. **Payload Structure**:
   ```json
   {
     "device_name": "Encrypted Base64 Device Name",
     "content": "Encrypted Base64 Clipboard Text"
   }
   ```
4. **Relay Server**: The FastAPI backend acts as a dumb relay. It groups connections into rooms by the SHA-256 hash of your secret room ID. It cannot read, decrypt, or log your clipboard contents since it does not possess your AES key.

---

## 🚀 Getting Started

### 1. Download & Install

- **Android**: Download the latest signed [`ClypSync.apk`](https://github.com/Clascheurduturfu/Everything-Clipboard/releases) from the Releases page.
- **macOS**: Download [`ClipSync.dmg`](https://github.com/Clascheurduturfu/Everything-Clipboard/releases), open it, and move the app to your Applications folder.
- **Windows**: Download [`ClipSync.exe`](https://github.com/Clascheurduturfu/Everything-Clipboard/releases) and launch the standalone system tray app.

---

## 🛠️ Configuration

### Desktop Client (Windows & macOS)

When you start the desktop client, it runs in your system tray:
- **Relay Server Mode**: Connect to a public/private Everything Clipboard relay server.
  1. Set your **Server URL** (e.g., `ws://your-server-ip:8000`).
  2. Set your **Room ID** (any shared secret string).
  3. Set your **Encryption Passphrase** (must match on all devices).
- **Host Server Mode**: Turn your desktop client into the relay server itself!
  1. Toggle **Host Mode** in the tray menu.
  2. The desktop client will start a local FastAPI websocket server on port `8000`.
  3. Connect other devices using `ws://<your-computer-ip>:8000`.

### Android Client

1. Open the **Everything Clipboard** app.
2. Enter the **Server URL** (e.g. `ws://192.168.1.50:8000`).
3. Enter your **Room ID** and **Encryption Passphrase**.
4. Tap **Connect**.
5. Enable the **Accessibility Service** when prompted (required to allow the app to read/write system clipboard events in the background reliably).
6. Enable **Run in Background** to stay synchronized when the app is closed.

---

## 💻 Running the Relay Server (Self-Hosting)

You can self-host your own FastAPI WebSocket relay server easily:

```bash
cd server-standalone
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Alternatively, use the provided Dockerfile:
```bash
cd server-standalone
docker build -t everything-clipboard-server .
docker run -d -p 8000:8000 everything-clipboard-server
```

---

## 🔨 Building From Source

### Android App
Ensure you have JDK 17+ and the Android SDK configured:
```bash
cd android-app
# Build debug APK
gradlew assembleDebug
# Or build and sign a release APK (requires clipsync.jks)
build-and-sign.bat
```

### Desktop Client
Requires Python 3.9+ and PyInstaller:
```bash
cd desktop-client
pip install -r requirements.txt
# Windows build:
build_windows.bat
# macOS build:
./build_macos.sh
```

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
