# ClipSync RC4 Preview

Android: **2.0-rc.4 (version code 9)**. Desktop hotfix: **2.0.1-beta.2**. iOS: **2.0 beta 4 (build 4)**.

## Desktop TLS hotfix

The RC4 desktop hotfix is published as `v2.0.1-beta.2`, preserving the original RC4 tag and assets. Standalone Python on macOS can lack a usable system CA store, causing update checks to fail with `CERTIFICATE_VERIFY_FAILED`. Desktop packages now include certifi's Mozilla root certificate bundle and load it alongside system trust for both metadata and package downloads. Certificate and hostname verification remain required.

The read-only `ClipSync --check-updates --channel preview` support command checks the live feed from the packaged executable without starting clipboard sync or changing settings. Legacy Mac installations require one manual replacement because their updater cannot fetch the corrected package.

This desktop hotfix also repairs chunk IDs for large transfers and records text lengths instead of clipboard contents in diagnostic logs.

This preview adds custom/default relay selection across the apps, integrated Android key reveal/generation/sharing, desktop key generation, a styled clipboard disclosure, and clearer notification and connection behavior. Generated keys contain 48 cryptographically random bytes encoded as 64 URL-safe characters. Existing custom relay addresses remain saved when default mode is selected.

## Downloads and platform limits

Use GitHub release assets for Windows ZIP, Apple Silicon Mac DMG and unsigned iOS IPA. The Mac app is ad-hoc signed and is not Developer ID signed or notarized. The iOS IPA requires the recipient's own valid signing/provisioning before device installation; it is not an App Store/TestFlight distribution.

The Android Play build is published to Internal testing for configured testers; the Alpha closed-test release is separately subject to Google's review. Join the relevant test with the same Google account used in Play Store. Internal testing does not count toward the closed-test production-access enrollment requirement.

The GitHub Android APK uses the project's upload certificate. Google Play uses its separate distribution signing certificate, so install/update the Play version through Play Store. Do not uninstall an existing app without preserving the settings you need. Signing keys, passwords and reviewer credentials are kept outside Git.

## Desktop preview updates

Updated desktop clients discover platform packages through GitHub's published releases and their `latest.json` asset. Stable excludes prereleases; Preview selects prereleases. Downloads must match the manifest and GitHub's asset SHA-256 and size. Legacy desktop clients which only understand branch-hosted packages need one manual installation of this preview; subsequent release discovery uses the new feed. No automatic replacement occurs without choosing Install & Restart.

The updater understands both spaced and semantic prerelease version strings, preventing an installed preview being interpreted as version zero. Windows ZIP paths and expanded size are checked before extraction. Update discovery/download verification has local fixture coverage; automatic swap/relaunch remains dependent on the existing platform helper and is not claimed as a newly verified end-to-end install.

## Validation

- Android release AAB/APK, lint and signing verification passed. API 37 emulator passed 23 UI/privacy checks and seven public-relay regressions. Broader Android-version/device coverage and long-duration foreground-service limits remain outside these checks.
- Windows packaged Preferences startup and actual CTk controls were checked. Desktop tests cover echo protection, relay selection, key generation, semantic versions, release channel discovery and malformed packages.
- Mac desktop and unsigned iOS Release builds were compiled with the existing toolchains. Mac packaging and iOS compile success do not establish a real iPhone install or a notarized Mac distribution.
- No website payment/sign-in changes are included in this app preview. Android account sign-in and in-app purchases are not implemented.
