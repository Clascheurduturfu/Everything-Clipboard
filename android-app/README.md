# ClipSync Android

Android client for encrypted text and image clipboard synchronization.

## Build

Use JDK 17 or 21 and Android SDK 36. The wrapper uses Gradle 8.11.1 and AGP 8.10.1.

- Debug: `gradlew.bat assembleDebug`.
- Signed release AAB/APK and lint: `build-and-sign.bat` (Windows).
- See RELEASE_SIGNING.md for the private external keystore, DPAPI password and output paths.

Candidate: **2.0-rc.4 (9)**. Read PLAY_RELEASE_REVIEW.md before submitting to Google Play.

## Connect and use

Enter a relay URL (`wss://` recommended), a strong shared secret and a device name. Save & Connect uses the same secret on your other devices. Text and images are encrypted client-side before transmission. Self-hosted `ws://` relays remain supported and expose connection metadata to the local network; prefer TLS.

Custom server URL is enabled on first install. Turn it off under Behaviour to hide the address field and use `wss://serv.everything-clipboard.com`; your custom address is preserved. The secret-key field has reveal/hide, secure 64-character generation and system sharing controls. Generated changes apply when saved; share only with trusted devices.

The app can read clipboard contents while focused. Android 10+ restricts background clipboard access: use Send Clipboard in Quick Settings or the optional notification action to send from another app. Run in background keeps an optional visible receiving session active, subject to Android limits. Android 15+ limits dataSync foreground services to six background hours per 24 hours, reset by returning the app to the foreground. There is no accessibility service or generic clipboard runtime permission.

Permissions: Internet for relay traffic, network state for metering checks, foreground service/dataSync for the optional visible background session, and notification permission on Android 13+. Clipboard images use content URIs and a private cache; broad storage/photo permissions are not requested. The Wi-Fi-only setting currently uses Android's metered-network classification.

The Android policy/disclosure and privacy controls are implemented; Data safety answers and the FGS declaration/demo are prepared. First Play Console setup, submission and remaining runtime coverage are described in PLAY_RELEASE_REVIEW.md. The generated signing key is new: existing sideloaded installations signed with the old key need uninstall/reinstall.
