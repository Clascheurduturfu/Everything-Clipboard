# ClipSync 2.0-rc.2 — Play Console Data safety answers

Prepared and saved in Play Console on 29 October 2026 for package `com.clipsync`, version code 7. Public policy: https://everything-clipboard.online/clipsync-privacy.html . This covers the Android app and the inspected ClipSync-operated relay, not the separate concept site/store. Saving the declaration does not mean Google has approved it; see privacy/PLAY_CONSOLE_STATUS.md for submission status.

## Overall answers

| Play question | Answer for this build | Reason |
|---|---|---|
| Does the app collect or share any required data types? | **Yes** | The operated relay/infrastructure processes and logs connection IPs, a stable shared-room hash and connection/error metadata. Do not answer No solely because clipboard content is encrypted. |
| Is all collected user data encrypted in transit? | **No** | The app permits user-configured `ws://` relays. Clipboard payloads are encrypted with AES-GCM, but that does not protect all connection metadata. `wss://` is recommended. This answer can change only after every supported data path satisfies the secure-transport requirement. |
| Can users request deletion? | **Yes** | In-app Privacy and data supports consent withdrawal and local erasure; server-record requests go to support@everything-clipboard.online. Policy explains identification and limits. |
| Does the app support account creation? | **No** | Android uses a relay URL and shared secret; it does not create or sign in to a user account. Separate website accounts are outside this app's flow. |
| Independent security review / Families commitment? | **Do not select** | No such review or certification was performed; do not claim one. |
| Advertising ID / ads? | **No** | No advertising ID permission or advertising SDK is present. |

## Data type entries

| Data type | Collected | Shared | Purpose | Required / optional | Ephemeral? |
|---|---|---|---|---|---|
| Device or other IDs | Yes | No, subject to service-provider and user-directed-transfer exceptions below | App functionality; fraud prevention, security and compliance | Required for network synchronization | No: connection identifiers/IPs may appear in operational logs |
| App info and performance → Diagnostics | Yes | No, subject to service-provider exception | App functionality; fraud prevention, security and compliance | Required for the operated relay's connection/error handling | No: errors/connection status may be logged |

Here, 'Device or other IDs' conservatively covers the app/group-associated shared-room identifier and network IPs used to operate the session. The app does not read Android ID, Advertising ID, IMEI or a hardware identifier. The shared-room hash identifies a synchronization group rather than a named account; there is no separate account/User IDs field sent by the app. No IP geolocation is performed by the inspected relay. Do not declare location simply because packets have IP addresses; reassess if geolocation or location-based analytics is introduced.

No analytics, advertising, personalization or marketing purpose should be selected for these entries. Daily relay-log rotation is configured; rotated files expire after 30 days (up to 31 days including the current log). Provider infrastructure/security retention is separately governed by Oracle/Cloudflare.

## Clipboard data and exceptions

The app accesses text (other user-generated content), images (photos), image metadata and a user-entered device name. These are encrypted on-device, and the encryption secret is not given to the operated relay. Under Google's stated end-to-end-encryption exception, data unreadable by the developer/intermediary and readable only by sender/recipient does not need to be declared as collected. This exception is the basis for excluding **clipboard plaintext, photos and device-name plaintext** from the collection table; it does not exempt operational metadata.

Transfers to the user's selected peer devices and the local system clipboard occur for the feature the user explicitly enables after the prominent disclosure. Google has user-initiated/prominent-disclosure-and-consent exceptions to reporting these transfers as sharing. Oracle/Cloudflare infrastructure is used as a service provider, not an advertising data recipient. Do not add a broad 'sold/shared for advertising' claim.

The fixed PBKDF2 salt and a hash of the shared secret are part of the existing protocol; weak secrets remain vulnerable to guessing. The disclosure/policy instruct users to choose a long, unique random secret. Do not tell users the system is independently audited, perfectly anonymous or immune to relay compromise. If the developer gains access to an actual user secret or introduces server-side decryption/content logging, the E2EE exception must be reassessed.

## Scope checks before entering these answers

- The inspected operated relay broadcasts encrypted text frames and has no clipboard database/history. Infrastructure processes operational connection metadata as described in the policy. No live user message contents or logs were read for this review.
- The Android configuration includes AndroidX Core and OkHttp; the website's Firebase/Stripe libraries are not Android SDKs. Opening the online policy uses the user's external browser.
- The owner selected ages 13 and up and approved IARC terms. Ratings were generated in Console. The personal account requires 12 opted-in closed testers for 14 continuous days before production access. No independent security review was performed.
- This data-flow interpretation follows Google's current definitions; the developer must keep the submitted answers accurate if the implementation, relay or providers change.

## Official references

https://support.google.com/googleplay/android-developer/answer/10787469 — E2EE, service-provider and user-directed-transfer exceptions; collection, sharing and data types.

https://support.google.com/googleplay/android-developer/answer/18258653 — user data, privacy policy, prominent disclosure and consent.
