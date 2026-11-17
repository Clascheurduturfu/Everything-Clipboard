# ClipSync 2.0 RC6

Preview release `v2.0-rc.6` (desktop `2.0-rc.6`, Android version code 12; iOS build 6).

## Changes

- Preferences now has a **Save** action that keeps the dialog open. **Close** applies saved connection changes; closing with unsaved edits offers Save, Discard, or Keep editing.
- Manual update checks stay visible in Preferences, show a progress indicator, and report whether an update is available or the check failed.
- The updater reports when the newest preview has no package for the current platform, rather than incorrectly claiming the app is up to date.
- Windows ZIP contents are at the archive root (`ClipSync.exe` and `_internal`), so extraction does not create an extra nested application folder.
- Release assets include Windows and macOS desktop builds.
- Android now supports **Share → ClipSync** (`ACTION_SEND`) to send images (such as screenshots directly from the system Share sheet) and text without broad storage or photo-library permissions, plus an in-app **Send Image** System Photo Picker button and improved multi-item `ClipData` image detection.

## Platform versions

- Windows/macOS desktop: `2.0-rc.6`
- Android: `2.0-rc.6` (version code 12)
- iOS source build: `2.0` (build 6)
