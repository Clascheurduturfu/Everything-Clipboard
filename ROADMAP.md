# ClipSync roadmap and notes

Last updated: 2026-10-23. Current line: **2.0 beta N**, built from the `preview` branch. Nothing goes to `main` without explicit approval.

## Release status

| Version | Status | Contents |
|---|---|---|
| 2.0 beta 1 | Shipped (Drive Transfer) | Desktop: Dock hiding on macOS, single-instance lock, Hosting tab, new Preferences UI, reconnect backoff. Android: iOS-style UI, Quick Settings tile fix, APK 2.9 MB → 0.3 MB. **No iOS changes.** |
| 2.0 beta 2 | Shipped (Drive Transfer, `preview`) | Image sync on all platforms (payload v2), file copies no longer synced as text, in-app updater (desktop), original tray icon back, switch styling fix. |
| 2.0 beta 3 | Planned | Samsung Continuity native clipboard bridge (see below). |
| 2.0 beta 4+ | Ideas | See the backlog. |
| 2.0 rc 1 | After betas | Stabilisation, merge `preview` → `main` (needs approval), website downloads. |

## Beta 3: native Samsung clipboard (waiting on Galaxy Continuity Lab)

**Blocked until** image transfer works in `Projects/samsung continuity` (its `TODO.md` §4). Text already works there.

Goal: a Galaxy phone joins the ClipSync room **with no ClipSync app on the phone**, through Samsung's own cross-device clipboard.

- **B0, works today with no code:**
  - Mac: run Galaxy Continuity Lab with automatic sync next to ClipSync; the two meet through the Mac clipboard.
  - Windows: Microsoft Phone Link's cross-device copy and paste does the same. Still to verify on this PC.
- **B1, `galaxy-bridge` helper (macOS):**
  - A headless, clipboard-only executable built from `ContinuityCore`, spawned by ClipSync only when the user enables "Samsung Galaxy native clipboard". It talks to ClipSync as JSON lines over stdin/stdout.
  - The phone appears as its own device in the room.
  - Split the calling libraries out of `ContinuityCore` so the bridge stays small.
  - Only one process may own the phone link, so the bridge refuses while the Lab app is connected.
- **B2:** "Sign in with Samsung" in ClipSync Preferences, so the Lab app isn't needed.
- **B3:** Samsung images, once the Lab's image path is verified on a real phone.
- **Limits to state in the UI:**
  - The phone is only in the room while it is within Bluetooth range of the Mac running the bridge.
  - The protocol is private and labelled "Experimental".
  - There is no Windows bridge.

## Backlog (candidates for beta 4+)

- **Android home-screen widget** for Send Clipboard, next to the Quick Settings tile.
- **iOS Share Extension** for images: the `ShareExtension` target exists, but beta 2 only changed the main app.
- **Android `targetSdk` 34 → 35/36** (needed before any Play Store release).
- **Website:** publish beta builds (`website/scripts/upload-downloads.mjs`) and show the version.
- **Optional `create-dmg`** on the MacBook for the styled DMG window. The hdiutil fallback works.
- **Relay hardening:** explicit 16 MiB WebSocket limit in `server-standalone/main.py`, plus room size and rate limits.
- **Retire legacy APKs** in `android-app/` (`ClypSync v1/v2.apk`) and the stale `.idsig` files.

## Not yet verified on real devices

- Image sync with an actual Android phone and iPhone; the desktop-to-desktop path is tested end to end.
- Copying a file in Finder against the real Mac clipboard (covered by an automated test only).
- iOS beta 2 was compiled (Release, device), never installed or run.
- Android Quick Settings tile behaviour with the app in Recents (needs a phone).

## Protocol and server

- **Relay:** `server-standalone/main.py` (FastAPI) and the built-in Host mode (`desktop-client/host_server.py`) forward encrypted messages without reading them. **No beta so far needed a server change.** Messages of 9 MB were verified through `serv.everything-clipboard.com`.
- **Payload v2** (AES-256-GCM, same key derivation as before):
  - Text: `{"v":2,"id","device_name","content"}`. Older clients still read it.
  - Image: `{"v":2,"id","device_name","type":"image","mime","data"(base64),"sha256","w","h"}` with **no `content`**, so older clients skip it.
- **Images:**
  - Capped at **5 MB** of image data, about 9 MB on the wire.
  - Clients accept WebSocket messages up to 16 MiB.
  - Android sends images on Wi-Fi only by default.

## Desktop updater

- **What it reads:** `desktop-client/build-output/latest.json` on the `main` branch, or on `preview` when "Developer: preview updates" is on. It checks at startup and every 12 h, and installs only when the user clicks *Install update*.
- **Install:** it verifies the SHA-256, swaps the app in place and relaunches. Windows replaces the install folder; macOS remounts the DMG and replaces the `.app`.
- **Publishing an update:**
  1. Bump the version.
  2. Run `build_windows.bat` and `build_macos.sh` + `build_dmg.sh`; each one updates `latest.json`.
  3. Commit the packages together with `latest.json`, then push.
- **Version order:** beta < rc < release (`updater.parse_version`).

## Build cheat sheet

- **Versions to bump on every fix:**
  - desktop: `APP_VERSION` in `desktop-client/app.py` and `assets/version_info.txt`;
  - Android: `versionName`/`versionCode` in `android-app/app/build.gradle.kts`;
  - iOS: `MARKETING_VERSION`/`CURRENT_PROJECT_VERSION` and the footer string in `ContentView.swift`.
- **Windows:** `desktop-client\build_windows.bat`. Quit the running `ClipSync.exe` first.
- **Android:** `android-app\build-and-sign.bat`. Needs JDK 17 (pinned in the script); AGP 8.2 fails on JDK 21. Never run `init-gradle.bat`: it overwrites the tracked Gradle wrapper.
- **macOS** (on `ssh macbook-vpn`):
  - Ship the sources with `git -c core.autocrlf=false -c core.eol=lf archive <rev> desktop-client`.
  - Build in a temporary venv: `build_macos.sh`, then `build_dmg.sh`.
  - Delete the build tree afterwards.
- **iOS compile check:** `xcodebuild -scheme ClipSync -destination generic/platform=iOS CODE_SIGNING_ALLOWED=NO`.
- **Tests:** `python desktop-client/test_echo_guard.py` (10) and `python desktop-client/test_updater.py` (8).
- **Release drop:** copy the packages to `G:\Mon Drive\Transfer` as `ClipSync-<version>-<platform>.<ext>`.
