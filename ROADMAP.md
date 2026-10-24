# ClipSync roadmap and notes

Last updated: 2026-10-24. Current line: **2.0 beta N**, built from the `preview` branch. Nothing goes to `main` without explicit approval.

## Release status

| Version | Status | Contents |
|---|---|---|
| 2.0 beta 1 | Shipped (Drive Transfer) | Desktop: Dock hiding on macOS, single-instance lock, Hosting tab, new Preferences UI, reconnect backoff. Android: iOS-style UI, Quick Settings tile fix, APK 2.9 MB → 0.3 MB. **No iOS changes.** |
| 2.0 beta 2 | Shipped (Drive Transfer, `preview`) | Image sync on all platforms (payload v2), file copies no longer synced as text, in-app updater (desktop), original tray icon back, switch styling fix. |
| 2.0 beta 3 | Shipped (`preview`) | Desktop: tray overhaul (hosting options removed, blue tray icon and "Hosting" status when hosting), stale disconnect state fixed, preferences window icon and launch speedup, 8 MB image limit + auto-downscaling on send. Android: "sensitive" switch removed, dual Wi-Fi controls (send & receive), in-memory safe re-encode on send. Relay: explicit 16 MiB WebSocket limits. |
| 2.0 beta 4 | Planned | Android accessibility service retirement / clean-up (see background clipboard findings below), home-screen widget. |
| 2.0 rc 1 | After betas | Stabilisation, merge `preview` → `main` (needs approval), website downloads. |

## Beta 4: Android background clipboard & accessibility retirement

**Empirical test results (2026-10-24, Galaxy Tab S9+, Android 16 / One UI 8):**
- When ClipSync is in the background, copying text in other apps is blocked by Android's `ClipboardService`:
  `ClipboardService: Denying clipboard access to com.clipsync, application is not in focus nor is it a system service for user 0`.
- Even though `ClipboardAccessibilityService` receives `onAccessibilityEvent` or clip notifications, any attempt to read clipboard content (`getPrimaryClip()`) returns `null`.
- The foreground service alone cannot read background copies either.
- Because background reading is strictly blocked by the OS on modern Android:
  - The accessibility bridge generates unnecessary battery drain and triggers frequent clipboard-access toasts with no functional benefit.
  - Plan for Beta 4: retire `ClipboardAccessibilityService`, removing the service declaration, accessibility config, and "Open Clipboard Bridge settings" button. Background sends will remain fully supported via the persistent notification action, Quick Settings tile, and transparent floating launcher.

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

- **Relay:** `server-standalone/main.py` (FastAPI) and the built-in Host mode (`desktop-client/host_server.py`) forward encrypted messages without reading them. Hardened with an explicit **16 MiB** WebSocket frame limit (`ws_max_size=16*1024*1024`).
- **Payload v2** (AES-256-GCM, same key derivation as before):
  - Text: `{"v":2,"id","device_name","content"}`. Older clients still read it.
  - Image: `{"v":2,"id","device_name","type":"image","mime","data"(base64),"sha256","w","h"}` with **no `content`**, so older clients skip it.
- **Images:**
  - Capped at **8 MB** of image data (~14.2 MB on the wire).
  - Clients and relays accept WebSocket messages up to 16 MiB.
  - Oversize images (such as Samsung motion photos with appended videos) are automatically re-encoded as JPEG and downscaled in steps (2560 px, 1920 px, 1280 px; qualities 90, 80, 70) on both Desktop and Android before transmission.
  - Android provides separate switches for sending on Wi-Fi only and receiving on Wi-Fi only.

## Desktop updater

- **What it reads:** `desktop-client/build-output/latest.json` on the `main` branch, or on `preview` when "Developer: preview updates" is on. It checks at startup and every 12 h, and installs only when the user clicks *Install update*.
- **Install:** it verifies the SHA-256, swaps the app in place and relaunches. Windows replaces the install folder; macOS remounts the DMG and replaces the `.app`.
- **Publishing an update:**
  1. Bump the version.
  2. Run `build_windows.bat` and `build_macos.sh` + `build_dmg.sh`; each one updates `latest.json`.
  3. Commit the packages together with `latest.json`, then push to `preview`.
- **Version order:** beta < rc < release (`updater.parse_version`).

## Build cheat sheet

- **Versions to bump on every fix:**
  - desktop: `APP_VERSION` in `desktop-client/app.py` and `assets/version_info.txt`;
  - Android: `versionName`/`versionCode` in `android-app/app/build.gradle.kts`;
  - iOS: `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` and the footer string in `ContentView.swift`.
- **Windows:** `desktop-client\build_windows.bat`. Quit the running `ClipSync.exe` first.
- **Android:** `android-app\build-and-sign.bat`. Needs JDK 17 (pinned in the script); AGP 8.2 fails on JDK 21. Never run `init-gradle.bat`: it overwrites the tracked Gradle wrapper.
- **macOS** (on `ssh macbook`):
  - Ship the sources with `git -c core.autocrlf=false -c core.eol=lf archive <rev> desktop-client`.
  - Build in a temporary venv: `build_macos.sh`, then `build_dmg.sh`.
  - Delete the build tree afterwards.
- **iOS compile check:** `xcodebuild -scheme ClipSync -destination generic/platform=iOS CODE_SIGNING_ALLOWED=NO`.
- **Tests:** `python desktop-client/test_echo_guard.py` (10) and `python desktop-client/test_updater.py` (8).
