# ClipSync Store

The ClipSync store uses Google-backed Firebase accounts, Stripe live Checkout, Firestore entitlements, and private Vercel Blob downloads.

## Local development

```bash
copy .env.example .env.local
npm run dev
```

The Firebase Admin credentials, Stripe keys, and Blob token remain server-only. Do not commit `.env.local`.

## Vercel preview setup

1. Create a Vercel project named `clipsync-preview`, rooted at `website/`, and deploy it to obtain its stable `clipsync-preview.vercel.app` URL.
2. In Firebase Console for `clipsync-store-20260823`, add that hostname under Authentication > Settings > Authorized domains, then enable Google as a sign-in provider.
3. Create a Firebase Web App and a Firebase Admin service account. Add every value in `.env.example` to Vercel Project Settings > Environment Variables for Preview and Production. Never expose the Admin private key.
4. Create a **private** Vercel Blob store named `clipsync-downloads` and attach it to the project. Vercel adds `BLOB_READ_WRITE_TOKEN` automatically.
5. Upload the current application artifacts:

```bash
npm run upload:downloads
```

The script uploads the Windows ZIP, macOS DMG, Android APK, and iOS IPA using the protected `downloads/` paths configured in `.env.example`.

6. In Stripe, add `https://clipsync-preview.vercel.app/api/stripe/webhook` as a live webhook endpoint. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, and `charge.refunded`; add the returned signing secret as `STRIPE_WEBHOOK_SECRET`.
7. Deploy. Checkout requires a Google-backed HttpOnly session, Stripe webhooks grant/revoke access, and the app streams paid downloads from the private Blob store.

## Firestore rules

Deploy the included rules after signing in to Firebase CLI:

```bash
npx firebase-tools login
npx firebase-tools deploy --project clipsync-store-20260823 --only firestore:rules
```

The paid account page displays `wss://serv.everything-clipboard.com` as the public relay URL.
