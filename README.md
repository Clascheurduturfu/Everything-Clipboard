# 📋 Everything Clipboard (ClipSync v2.0)

[![Release](https://img.shields.io/github/v/release/Clascheurduturfu/Everything-Clipboard?style=for-the-badge&color=7C3AED)](https://github.com/Clascheurduturfu/Everything-Clipboard/releases)
[![Platforms](https://img.shields.io/badge/platforms-Android%20%7C%20Windows%20%7C%20macOS%20%7C%20iOS-blue?style=for-the-badge&color=2563EB)](https://everything-clipboard.online)
[![License](https://img.shields.io/badge/license-MIT-green?style=for-the-badge&color=059669)](https://github.com/Clascheurduturfu/Everything-Clipboard/blob/main/LICENSE)
[![Security](https://img.shields.io/badge/security-AES--256--GCM-orange?style=for-the-badge&color=D97706)](#-security-architecture)

**Everything Clipboard** (ClipSync) is a secure, cross-platform, self-hostable utility that instantly synchronizes your clipboard text and **high-resolution images (up to 16 MB)** across **Android, Windows, macOS, and iOS** devices.

No proprietary cloud lock-in. No unencrypted data. Just copy on one device, and paste on another in milliseconds.

---

## ✨ Features in v2.0

- 🖼️ **16 MB High-Resolution Image Sync**: Seamlessly sync screenshots, photos, and graphic assets between all your devices with raw pixel fidelity.
- ⚡ **Adaptive 512 KiB Chunking Protocol (`cs_chunk:v1`)**: High-res images and large payloads stream in 512 KiB chunks over WebSockets, bypassing mobile memory limits, proxy size caps, and packet loss with out-of-order SHA-256 verification.
- ⚡ **Fast Single-Pass Image Processing**: Images up to 16 MB stream completely untouched. Images exceeding 16 MB are downscaled in under 200ms to preserve responsiveness.
- 🔒 **Client-Side Zero-Trust Encryption**: Everything is encrypted *before* leaving your device using **AES-256-GCM** with a **PBKDF2-derived 256-bit key (200,000 iterations)**. The relay server only sees opaque encrypted frames.
- 📶 **Smart Bandwidth Control**: Consolidated **"Images on Wi-Fi Only"** toggle to prevent mobile data consumption when on cellular networks.
- 💻 **Zero-Config Local Mode & Built-in Relay**: Turn any desktop client into the relay server with a single click using **Host Mode** (runs an embedded local WebSocket server).
- 📱 **Modern Android Integration (targetSdk 35)**:
  - Compliant with Android 15/16 security rules using `FOREGROUND_SERVICE_DATA_SYNC`.
  - **Quick Settings Tile** & persistent notification actions for instant one-tap sync.
  - **Floating Launcher Bubble** for effortless clipboard broadcasting over any app without manual app switching.
  - Sensitive clipboard flagging to prevent third-party keyboard history leakage.
- 🔄 **Desktop In-App Updater**: Windows and macOS clients automatically check and stage seamless updates from the release channels.

---

## 🔒 Security Architecture

Everything Clipboard uses a strict zero-trust model:

1. **Passphrase Derivation**: Your shared secret key is stretched locally using **PBKDF2 with 200,000 iterations (HMAC-SHA256)** to derive a cryptographically strong 256-bit AES key.
2. **Authenticated Encryption**: Every payload is encrypted client-side using **AES-256-GCM** with a unique 12-byte initialization vector (IV) per message.
3. **Payload Structure (v2)**:
   - **Text**:
     ```json
     {
       "v": 2,
       "id": "7b8a...",
       "device_name": "MacBook Pro",
       "content": "Synchronized clipboard text"
     }
     ```
   - **Image**:
     ```json
     {
       "v": 2,
       "id": "9c1e...",
       "device_name": "Windows PC",
       "type": "image",
       "mime": "image/png",
       "data": "<base64 encoded image>",
       "sha256": "4a12...",
       "w": 1920,
       "h": 1080
     }
     ```
4. **Relay Server**: The FastAPI backend functions as an oblivious relay. Room routing is identified solely by the SHA-256 hash of your secret Room ID. The server never possesses your encryption passphrase and cannot decrypt, read, or persist any clip data.

---

## 🚀 Getting Started

### 1. Download & Install

Download official v2.0 packages directly from [everything-clipboard.online/download](https://everything-clipboard.online/download) or the [GitHub Releases](https://github.com/Clascheurduturfu/Everything-Clipboard/releases) page:

- **Windows**: Download [`ClipSync.exe`](https://everything-clipboard.online/download) (or standalone `ClipSync.zip`).
- **macOS**: Download [`ClipSync.dmg`](https://everything-clipboard.online/download), drag it to `/Applications`, and open.
- **Android**: Download [`ClypSync.apk`](https://everything-clipboard.online/download) or install the Google Play `.aab` bundle.
- **iOS**: Install [`ClipSync-ios.ipa`](https://everything-clipboard.online/download) via AltStore, Sideloadly, or TrollStore.

---

## 🛠️ Configuration

### Desktop Client (Windows & macOS)

ClipSync runs unobtrusively in your system tray / menu bar:
- **Relay Server Mode**: Connect to any public or self-hosted Everything Clipboard relay server:
  1. Set **Server URL** (e.g. `wss://relay.everything-clipboard.online` or `ws://192.168.1.50:8000`).
  2. Enter your shared **Room ID** and **Encryption Passphrase**.
  3. Toggle **Sync Images** and configure **Images on Wi-Fi only** according to your network needs.
- **Host Server Mode**: Turn your desktop client into the local room relay!
  1. Switch to the **Hosting** tab in Preferences and toggle Host Mode on.
  2. Connect your other devices using `ws://<your-computer-ip>:8000`.

### Android Client

1. Open the **Everything Clipboard** app.
2. Enter the **Server URL**, **Room ID**, and **Encryption Passphrase**.
3. Tap **Connect**.
4. Enable **Run in Background** to start the foreground data-sync service.
5. **Broadcasting Clips**: Due to modern Android background clipboard security restrictions, use:
   - The **Quick Settings Tile** in your notification shade.
   - The **"Send Clipboard"** action directly on the persistent notification.
   - The **Floating Bubble** widget for instantaneous one-tap capture without leaving your current app.

---

## 💻 Running the Relay Server (Self-Hosting)

You can self-host your own lightweight FastAPI WebSocket relay server:

```bash
cd server-standalone
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

Or deploy with Docker:

```bash
cd server-standalone
docker build -t everything-clipboard-server .
docker run -d -p 8000:8000 everything-clipboard-server
```

*Note: For self-hosted servers with image sync enabled, ensure WebSocket frame limits are set to 32 MiB (`ws_max_size=33554432`).*

---

## 🔨 Building From Source

### Android App
Requires JDK 17+ and Android SDK (targetSdk 35, compileSdk 35):
```bash
cd android-app
# Build signed Release APK
./gradlew assembleRelease
# Build Google Play App Bundle (.aab)
./gradlew bundleRelease
```

### Desktop Client
Requires Python 3.9+ and PyInstaller:
```bash
cd desktop-client
pip install -r requirements.txt

# Windows standalone executable:
build_windows.bat

# macOS Application bundle & DMG:
./build_macos.sh
./build_dmg.sh
```

### iOS App
Requires macOS and XcodeGen:
```bash
cd ios-app
xcodegen generate
xcodebuild -project ClipSync.xcodeproj -scheme ClipSync -configuration Release
```

---

## 📄 License

This project is open source and licensed under the [MIT License](LICENSE).
