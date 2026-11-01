# Android RC4 release checks

Candidate: **2.0-rc.4 (9)**, package `com.clipsync`, minimum API 26, target/compile API 36.

## Implemented safeguards

- Explicit, versioned clipboard disclosure and affirmative consent before clipboard/service entry; refusal, withdrawal and local erasure remain available.
- An offline in-app policy is generated alongside the public policy from `privacy/policy.json`. Public URL: https://everything-clipboard.online/clipsync-privacy.html .
- User-enabled foreground receiving with notification/Stop action, no sticky restart after consent withdrawal, Android dataSync timeout handling, and one-shot manual sending through an activity for background clipboard restrictions.
- No Android account, billing, ads, Advertising ID, analytics SDK, accessibility service or broad photo-library permission.
- Private settings excluded from Android backup/device transfer. No private signing material is part of source or release assets.

## Validation and publication

Release build/lint and AAB/APK signature verification passed. API 37 instrumentation passed 23 UI/privacy checks and seven relay checks, including encrypted paired receipt, real notification action presence, key tools and consent/deletion. These checks do not replace testing on every supported Android version or a six-hour timeout run.

RC4 is published on Internal testing for the configured audience. Alpha closed testing is separately subject to Google review. Production access and its closed-test requirements remain separate; internal participants do not satisfy closed-test enrollment requirements. Successful builds or API uploads do not imply policy approval.

Reviewers receive a dedicated synthetic-room credential through Play Console app-access instructions. It must never appear in public source, docs, recordings or release notes. `server-standalone/play_review_peer.py` supports an isolated synthetic peer with a private external configuration; `clipsync-play-review.service.example` is a generic service template.

## Release material

See `RELEASE_SIGNING.md`, `PLAY_DATA_SAFETY.md`, `PLAY_STORE_DATA_SYNC_DECLARATION.md` and the root `RELEASE_RC4.md`. The old upload key was exposed in earlier repository history and is treated as compromised; the current private upload key is external. Play App Signing uses a separate distribution identity.
