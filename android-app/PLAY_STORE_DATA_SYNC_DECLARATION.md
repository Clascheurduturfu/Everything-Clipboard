# Google Play foreground-service declaration — ClipSync 2.0-rc.2 (7)

Public app privacy policy: https://everything-clipboard.online/clipsync-privacy.html

## Type and use case

`FOREGROUND_SERVICE_DATA_SYNC` / `dataSync` — Network transfer: Upload or download. Describe the operation as user-enabled encrypted clipboard transfers/receiving between the user's own devices. Do not claim unrestricted automatic background clipboard capture or unlimited background execution. Google still decides whether this particular ongoing receiving session qualifies; the manifest, declaration and video are evidence, not approval.

## Core user-facing functionality (copy into Console)

ClipSync transfers client-side encrypted clipboard text and images between the user's Android device and their selected personal devices through a user-configured relay. The user saves the connection settings, reads an in-app explanation and explicitly taps Allow clipboard sync. Run in background is an optional, separately selected receiving session with a foreground notification. The notification includes Stop sync; Privacy and data also offers consent withdrawal and local-data erasure.

## User impact if deferred or interrupted (copy into Console)

The optional session is used when the user wants clipboard items from another device to arrive promptly. Deferring it would delay the requested transfer and could prevent receipt while the user is moving between devices. Interrupting the session disconnects the live relay connection; the relay does not retain clipboard history or deliver queued items offline. A clear foreground notification shows the active connection and lets the user stop it. The app honors Android's dataSync time budget and stops when onTimeout is called, without automatically restarting to evade the limit. On Android 15 and later the user must reopen the app after the six-hour background budget is exhausted.

## How the user starts and stops it (copy into Console)

The user enters the relay URL and their shared secret, taps Save & Connect and accepts the prominent clipboard disclosure. Sync is active while the app is open. The user can enable Run in background for continued receiving with a notification. They can end the session from Stop sync in that notification, or withdraw consent under Privacy and data. Withdrawal stops syncing and prevents reconnection until fresh consent. Turning off both Run in background and Send Clipboard button in notification ends the optional background session when the user leaves the app. Android restricts background reads: the Quick Settings tile and optional Send Clipboard notification action explicitly send once via a transient activity. The tile does not toggle the service.

## Demonstration

Public demonstration saved in Console: https://everything-clipboard.online/clipsync-play-demo-rc2.mp4 . It records real interactions in an isolated Android emulator and a paired local test peer using synthetic text. It is not an animation of an imagined app, and it is not a claim that Google has reviewed the app. The build shown is a debug test build of the same 2.0-rc.2 source; the distributable release AAB is separately signed with the external upload key.

The recording should show: Save & Connect → explicit disclosure and choice → encrypted transfer receipt → Run in background → background receipt and visible notification/Stop action → in-app privacy policy → consent withdrawal → local erasure. The local test relay address and synthetic shared secret are fixture-only. No personal clipboard data, production secret or signing key is in the recording.

## Reviewer access instructions

No Android account/login is required. Console app-access instructions include the operated public relay `wss://serv.everything-clipboard.com` and a dedicated synthetic-room credential, stored outside Git. A reboot-safe isolated peer is running on the relay host, sends synthetic text every 15 seconds and acknowledges sent text/images. It stores/logs no received content. Reviewers can test without a second personal device. Do not use personal clipboard data or a personal secret. Android-to-peer sending from another app uses Send Clipboard in Quick Settings or the notification; in-app text/images synchronize while ClipSync is focused. Privacy/disclosure/deletion screens are available offline. Keep deployment credentials and reviewer-room configuration outside the checkout.

## Evidence and remaining Console work

The code declares typed permission/service, handles onTimeout, uses START_NOT_STICKY, has an explicit Stop action and consent gates at the activity, one-shot send and service entry paths. The first app record/upload and Play signing enrollment are complete. The network-transfer Other option and the real demo URL were saved in the foreground-service form. No release validation error remained after this declaration; the tester-list warning remained. The account's 12-tester/14-day closed-test requirement still applies. Check the Play Console publication overview for current review status.

Official requirements: https://support.google.com/googleplay/android-developer/answer/13392821 and https://support.google.com/googleplay/android-developer/answer/18258653
