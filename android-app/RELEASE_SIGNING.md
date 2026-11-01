# Android release signing

Release candidate: **2.0-rc.4 (9)**, target/compile API 36, AGP 8.10.1, Gradle 8.11.1, JDK 17 or 21.

Run `build-and-sign.bat` on Windows. It builds the release AAB, APK and release lint with a temporary Gradle process.

The upload key lives outside this checkout in `%USERPROFILE%\Desktop\agent\ClipSync-private\signing\clipsync-upload.jks`. Its random password is in `upload-password.dpapi.xml`, encrypted by Windows DPAPI for the current account on this PC. The script decrypts it into process environment variables and clears them afterward. Do not enable environment dumps or Gradle debug logging for release builds.

Keep a separate, securely encrypted backup of this key and password. Copying the DPAPI file alone to another computer is not a portable backup. Never commit a key, password, service-account JSON or decrypted credential. The ignore rules are defense in depth; private files belong outside the repository.

Outputs:

- `app/build/outputs/bundle/release/app-release.aab`: upload to Google Play.
- `app/build/outputs/apk/release/app-release.apk`: direct-install test APK.
- `app/build/outputs/mapping/release/mapping.txt`: retain for crash deobfuscation.

The old `clipsync.jks` and hardcoded password were exposed in repository history. Removing them does not remove old commits, clones or forks. Treat the old key as compromised. The history has not been rewritten; old clones can still contain the compromised key.

The owner confirmed this package had never been uploaded to Play before this release. The first AAB signed with the new upload key was accepted on 29 October 2026; Play App Signing is enabled. Keep using this upload key for subsequent uploads. The public `upload-certificate.pem` contains no private key. Google manages the separate distribution signing key.

The new APK cannot update a sideloaded APK signed with the old key. Uninstall/reinstall loses app-local settings unless preserved separately. Play-generated APKs use Google's app signing key; download the Play-signed APK for future cross-channel compatibility.

## CLI

`gplay` 1.0.2 (third-party, https://github.com/tamtom/play-console-cli) is installed at `%USERPROFILE%\.local\bin\gplay.exe`. A main OAuth profile was configured separately on 28 October 2026. Do not print gplay auth status/config files into logs: this CLI version can include OAuth client credentials. First app creation/upload and declarations were completed in Console on 29 October; the CLI then successfully saved listing text and contact details through the publishing API. Normal edit commits work; this draft app rejects the changes-not-sent-for-review flag. Keep all credential files outside Git.

Read `PLAY_RELEASE_REVIEW.md` before submitting. A signed build does not mean policy approval.
