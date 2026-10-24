# ClipSync roadmap and notes

Last updated: 2026-10-24. Current line: **2.0 beta N**, built from the `preview` branch. Nothing goes to `main` without explicit approval.

## Release status

| Version | Status | Contents |
|---|---|---|
| 2.0 beta 1 | Shipped (Drive Transfer) | Desktop: Dock hiding on macOS, single-instance lock, Hosting tab, new Preferences UI, reconnect backoff. Android: iOS-style UI, Quick Settings tile fix, APK 2.9 MB → 0.3 MB. **No iOS changes.** |
| 2.0 beta 2 | Shipped (Drive Transfer, `preview`) | Image sync on all platforms (payload v2), file copies no longer synced as text, in-app updater (desktop), original tray icon back, switch styling fix. |
| 2.0 beta 3 | Shipped (`preview`, live deployed) | **16 MB image sync** + 512 KiB WebSocket chunking protocol (`cs_chunk:v1`) across Android, Windows, and Mac; **fast single-pass image downscaling** (< 200ms) only when exceeding 16 MB (10 MB photos stream untouched); **full retirement of Android Accessibility Service** (`ClipboardAccessibilityService`) and bridge settings button; consolidated **single "Images on Wi-Fi only"** switch for send and receive; tray status & color fixes, preferences window instant launch, native icon; 32 MiB WebSocket limits; installed on MacBook (`/Applications/ClipSync.app`), Galaxy Tab S9+, and Galaxy S24 Ultra. |
| 2.0 beta 4 | Planned | Android home-screen widget, iOS Share Extension for images. |
| 2.0 rc 1 | After betas | Stabilisation, merge `preview` → `main` (needs approval), website downloads. |

## Android background clipboard & accessibility retirement

**Empirical test results (2026-10-24, Galaxy Tab S9+, Android 16 / One UI 8):**
- When ClipSync is in the background, copying text in other apps is blocked by Android's `ClipboardService`:
  `ClipboardService: Denying clipboard access to com.clipsync, application is not in focus nor is it a system service for user 0`.
- Even though `ClipboardAccessibilityService` receives `onAccessibilityEvent` or clip notifications, any attempt to read clipboard content (`getPrimaryClip()`) returns `null`.
- The foreground service alone cannot read background copies either.
- Because background reading is strictly blocked by the OS on modern Android:
  - The accessibility bridge generated unnecessary battery drain and triggered frequent clipboard-access toasts with no functional benefit.
  - **Retired in Beta 3**: completely removed `ClipboardAccessibilityService`, manifest entry, config XML, and "Open Clipboard Bridge settings" UI. Background sends are cleanly handled via the persistent notification action, Quick Settings tile, and transparent floating launcher.

## Discontinued: Samsung Continuity native bridge

- Discontinued after verification that Samsung's continuity protocol relies strictly on local Bluetooth proximity and BLE beaconing, making it unusable over wide-area networks or overseas.

## Backlog (candidates for beta 4+)

- **Android home-screen widget** for Send Clipboard, next to the Quick Settings tile.
- **iOS Share Extension** for images: the `ShareExtension` target exists, but beta 2 only changed the main app.
- **Android `targetSdk` 34 → 35/36** (needed before any Play Store release).
- **Website:** publish beta builds (`website/scripts/upload-downloads.mjs`) and show the version.
- **Optional `create-dmg`** on the MacBook for the styled DMG window. The hdiutil fallback works.
- **Retire legacy APKs** in `android-app/` (`ClypSync v1/v2.apk`) and the stale `.idsig` files.

## Protocol and server

- **Relay:** `server-standalone/main.py` (FastAPI) and the built-in Host mode (`desktop-client/host_server.py`) forward encrypted messages without reading them. Hardened with a **32 MiB** WebSocket frame limit (`ws_max_size=32*1024*1024`).
- **Chunking protocol:** Payloads over 512 KiB are automatically split into 512 KiB text frames (`cs_chunk:v1:<msg_id>:<idx>:<total>:<chunk>`), bypassing OkHttp's 16 MiB outgoing queue ceiling and intermediate proxy size restrictions. Reassembled seamlessly by all receivers.
- **Payload v2** (AES-256-GCM, same key derivation as before):
  - Text: `{"v":2,"id","device_name","content"}`. Older clients still read it.
  - Image: `{"v":2,"id","device_name","type":"image","mime","data"(base64),"sha256","w","h"}` with **no `content`**, so older clients skip it.
- **Images:** Up to **16 MB**. Images <= 16 MB stream directly untouched. Images > 16 MB downscale in a fast single pass (< 200ms) to 2560px long edge JPEG q85.
