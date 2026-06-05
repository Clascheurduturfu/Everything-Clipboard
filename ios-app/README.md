# 📱 ClipSync for iOS

Native iOS companion app for [Everything Clipboard](https://github.com/Clascheurduturfu/Everything-Clipboard).

## Features

- **Secure Sync**: AES-256-GCM encrypted clipboard sharing, fully compatible with Android and desktop clients
- **Zero Dependencies**: Built entirely with native iOS frameworks (SwiftUI, CryptoKit, URLSession)
- **Premium Dark UI**: Matches the Android app's design language
- **Manual Send**: Tap "Send Clipboard" to push your current clipboard to all connected devices
- **Auto-Copy**: Incoming clips are automatically copied to your clipboard (configurable)

## Requirements

- iOS 16.0+
- Xcode 15.0+
- Swift 5.9+

## Building

1. Open `ClipSync.xcodeproj` in Xcode
2. Select your development team in Signing & Capabilities
3. Build and run on your device or simulator

## iOS Limitations

Unlike Android, iOS does **not** allow background clipboard monitoring. The app can only:
- **Send clipboard** when you explicitly tap the "Send Clipboard" button
- **Receive clipboard** from other devices while the app is in the foreground
- **Auto-copy** received clips to your pasteboard immediately

The WebSocket connection stays alive while the app is in the foreground.

## Configuration

Enter the same connection details as on your Android/desktop clients:
- **Server URL**: e.g. `ws://192.168.1.50:8000`
- **Secret Key**: Your shared encryption passphrase (must match all devices)
- **Device Name**: A friendly name for this device

## Security

Uses the same zero-trust encryption as the Android app:
- **PBKDF2-HMAC-SHA256** (200,000 iterations) for key derivation
- **AES-256-GCM** for payload encryption
- **SHA-256** room ID hashing — server never sees your secret
