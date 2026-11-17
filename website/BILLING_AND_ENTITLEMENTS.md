# Shared paid access: implementation proposal

Prepared 2026-10-31. This is a design for after the current test phase, not a claim that Android sign-in or Play Billing is implemented.

## Existing implementation and limitations

The website uses Firebase Authentication with Google sign-in, server-verified session cookies, and Firestore `users/{uid}`. Its `purchased` boolean gates website downloads. Stripe Checkout binds the Firebase UID through `client_reference_id` and metadata. Orders belong in `orders/{checkoutSessionId}`. Android currently uses a relay URL/shared secret and has no account or payment check. A previously downloaded client cannot be disabled by removing website download access.

Local website fixes in 2.0.1-beta.1 remove the recent-Checkout auto-grant on account reads, bind fulfillment to the checkout owner UID, verify the expanded current PaymentIntent/charge against full refunds and disputes, persist orders from both the return page and webhook, and read before writing in the refund transaction. Offline regression checks, TypeScript and targeted ESLint are required before deployment. These changes do not themselves reconcile old customer records or add dispute event processing. No production website deployment or customer revocation is implied.

## Identity and ownership

Use Android Credential Manager's Google sign-in with Firebase Auth in the **same Firebase project as the website**, giving both clients the same Firebase UID. Register `com.clipsync` and the **Play App Signing distribution certificate** fingerprints, plus separate debug fingerprints. The upload certificate alone is insufficient for the installed Play build. Reuse the web/server OAuth client ID where required by Firebase's Android integration.

The Android app sends a short-lived Firebase ID token to HTTPS endpoints. The backend verifies issuer, audience, expiration and revocation; it derives UID from the verified token, never from a client-supplied email or UID. Android sign-in and the Play Store purchasing account can differ; bind purchases explicitly to the signed-in application UID before billing starts.

## One entitlement service, two independent payment processors

Keep Stripe Checkout on the website. Sell a non-consumable one-time `clipsync_lifetime` product through Google Play Billing inside the Play app. Existing website purchasers sign in and already have access; do not charge them twice. Keep the testing release usable while payment integration is not implemented.

Google processes and settles Play purchases. A Play purchase does not become a Stripe charge or Stripe balance transaction. Synchronize **access** through our backend, with provider-specific accounting and refunds. Avoid fake Stripe payments/invoices that imply Stripe processed a Google transaction. A unified admin page can show both sources and link to the relevant provider.

Suggested Firestore model (server writes only):

| Record | Main fields |
| --- | --- |
| `users/{uid}` | profile, timestamps; no authoritative client-editable `paid` flag |
| `purchases/{provider_externalIdHash}` | uid, provider (`stripe`/`google_play`), product, provider reference, state (`pending`, `active`, `refunded`, `revoked`, `disputed`), verifiedAt, grant/revocation timestamps |
| `entitlements/{uid}/products/clipsync_lifetime` | active, contributing purchase/grant IDs, revision, updatedAt |
| `manualGrants/{id}` | uid, reason, creator, active, expiry/revocation; explicit goodwill grants independent of refunded orders |
| `processedEvents/{provider_eventId}` | processedAt, event type, reference; idempotency ledger |

An entitlement is active while **any** valid purchase or explicit grant remains. A refund revokes its own purchase, not an unrelated purchase or goodwill grant. Retain audit records rather than deleting accounts. Index tokens with a stable hash, retain the original purchase token privately on the backend where needed for Google verification, and never log tokens or return other users' provider references. Firestore rules must deny client writes to purchases, entitlements, grants and processed events.

## Play purchase flow

1. Require Google/Firebase sign-in, load the entitlement, and show the price from Play product details only when access is missing.
2. Start Play Billing with an opaque stable account mapping in `obfuscatedAccountId` (for example backend-generated HMAC of UID; no plaintext email).
3. Send the purchase token to authenticated `POST /api/billing/google/verify`. Validate package, product, purchased state, account mapping, quantity and unique token ownership with Google's Developer API. A pending purchase grants nothing; a previously bound token may restore access only for its original UID.
4. In an idempotent transaction, save the verified purchase and recompute the entitlement. Acknowledge the non-consumable purchase on the backend after durable fulfillment, within Google's acknowledgement window. Retry failures through an outbox/job. Do not consume a lifetime unlock.
5. Configure Pub/Sub RTDN for all one-time products. Verify the push service identity/audience and re-query Google for current state; do not trust notification payload state alone. Add scheduled Voided Purchases reconciliation and retry monitoring so missed refunds/chargebacks revoke access.
6. On reinstall/foreground return, query owned purchases and verify them server-side to restore access. Explain account mismatches without silently transferring ownership.

## Stripe events and licensing

Use signature-verified Stripe events, including completed/async-success Checkout, full refund, and dispute lifecycle events. Re-fetch current provider state, deduplicate events, commit order and entitlement changes atomically, and handle delivery out of order. Decide explicitly whether an open dispute suspends access and whether partial refunds revoke anything. Reconcile historical orders and refunds before treating the current boolean as authoritative.

Expose authenticated `GET /api/entitlements`. Android and desktop check on sign-in/start, periodically, and before starting a new cloud sync session. A short-lived backend-signed entitlement lease can allow a defined offline grace period; check signature, UID, product, expiry and revision. Never trust a mutable local preference as a license. A refund cannot instantly revoke a device that is offline; document the maximum lease duration.

For meaningful enforcement of the hosted relay, authenticate its WebSocket upgrade with a short-lived backend-issued capability after checking entitlement. Preserve end-to-end content encryption; identity and room membership checks must not expose plaintext clips. Self-hosted relay access and existing downloadable clients need a deliberate product/migration policy; an open-source/offline client cannot be made tamper-proof by adding a local check. Play Integrity may supply an additional abuse signal, not replace ownership verification.

## Delivery order and acceptance

First reconcile the existing Stripe customer/order history and deploy the refund fixes. Then add shared sign-in and read-only entitlement display, then server verification/RTDN and Play license-tester sandbox purchases, and finally paid gating after the test phase. Update privacy policy, Data safety, reviewer instructions and in-app account-deletion flows before adding accounts to the Play release. Do not enroll in an alternative billing programme or add external purchase links as part of this plan.

Test valid purchase, pending/cancelled transaction, repeat verification, wrong UID/token replay, reinstall restoration, refund, dispute, another active grant, duplicate/out-of-order webhook delivery, invalid notification identity, provider outage and offline lease expiry. Exercise real Play test purchases through a Play-installed build and the distribution signing identity.

## Official references

- [Firebase Google authentication on Android](https://firebase.google.com/docs/auth/android/google-signin)
- [Google Play payment policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
- [Play purchase verification and security](https://developer.android.com/google/play/billing/security)
- [One-time purchase lifecycle, acknowledgement and notifications](https://developer.android.com/google/play/billing/lifecycle/one-time)
- [Stripe refunds](https://docs.stripe.com/refunds)
