# Everything Clipboard website

The Everything Clipboard site (the apps themselves are named ClipSync) uses Google-backed Firebase accounts, Stripe live Checkout, Firestore entitlements, and private Vercel Blob downloads.

## Local development

```bash
copy .env.example .env.local
npm run dev
```

Without the Firebase, Stripe and Blob variables the pages render but you cannot sign in, buy or download. `npm run build` and `npm run lint` must pass; the unit tests in `src/lib` are plain TypeScript files, see the header comment of each for how to run it (`download-source.test.ts` talks to the live download mirrors).

The footer shows `SITE_VERSION` from `src/lib/version.ts`; bump it with every deploy so you can tell which build you are looking at.

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

The apps connect to `wss://serv.everything-clipboard.com` by default. The paid account page shows that address only as optional reference, for people who changed the server or want to switch back from a self-hosted one.

## Docker

The `Dockerfile` builds the standalone output on Node 22 (Next.js 16 requires Node 20.9 or newer).
