import type { Metadata } from "next";
import Link from "next/link";
import { Apple, Check, CheckCircle2, Download, Laptop, Lock, Monitor, ShieldCheck, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ServerUrl } from "@/components/ServerUrl";
import { QrModalButton } from "@/components/QrModal";
import { SignInButton } from "@/components/SignInButton";
import { getAccountProfile, fulfillCheckoutSession, recoverPurchaseFromStripe } from "@/lib/entitlements";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Account",
  description: "Your Everything Clipboard license, downloads and setup.",
  robots: { index: false, follow: false },
};

type DownloadItem = {
  os: "windows" | "macos" | "android" | "ios";
  label: string;
  detail: string;
  badge: string;
  Icon: LucideIcon;
};

const downloads: DownloadItem[] = [
  { os: "windows", label: "Windows", detail: "Windows 10 / 11 (64-bit, .zip)", badge: "Portable zip", Icon: Monitor },
  { os: "macos", label: "macOS", detail: "macOS 12 or later (Apple Silicon and Intel, .dmg)", badge: "DMG", Icon: Laptop },
  { os: "android", label: "Android", detail: "Android 8.0 or later (.apk)", badge: "APK", Icon: Smartphone },
  { os: "ios", label: "iOS", detail: "iOS 15.0 or later (.ipa)", badge: "Sideload IPA", Icon: Apple },
];

const steps = [
  {
    title: "Install the apps",
    body: "Download the app for each of your devices and open it.",
  },
  {
    title: "Set the same secret key",
    body: "Enter the same secret key in every app. It encrypts your clipboard, so pick something only you know.",
  },
  {
    title: "Copy and paste",
    body: "The apps use the official relay by default, so there is no server to enter. Copy on one device and paste on another.",
  },
];

const notice = "rounded-xl border p-4 text-sm";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ purchase?: string; session_id?: string; signin?: string }>;
}) {
  const user = await getSessionUser();
  const query = await searchParams;

  if (user && query.session_id) {
    await fulfillCheckoutSession(query.session_id, user.uid);
  }

  let account = user ? await getAccountProfile(user.uid) : null;
  // Rare, explicit recovery for "paid but still unlicensed" (see entitlements).
  if (account && !account.purchased) {
    account = await recoverPurchaseFromStripe(account);
  }
  const purchaseJustMade = query.purchase === "success";
  const name = account?.displayName || "there";
  const initial = (account?.displayName || user?.email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />

      <main className="relative z-10 flex-grow px-4 pb-16 pt-28 sm:px-6 lg:pt-36">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Sent here by the checkout endpoint because there was no session */}
          {!user && query.signin === "required" && (
            <div role="status" className={`${notice} border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200`}>
              Please sign in first. Your purchase is linked to your Google account.
            </div>
          )}

          {/* Only for a signed-in user whose purchase is confirmed */}
          {purchaseJustMade && user && account?.purchased && (
            <div role="status" className={`${notice} flex items-start gap-3 border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200`}>
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-medium">Payment received</p>
                <p className="mt-0.5">Your license is active and the downloads are unlocked below.</p>
              </div>
            </div>
          )}

          {purchaseJustMade && user && account && !account.purchased && (
            <div role="status" className={`${notice} border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300`}>
              We are still confirming your payment. Reload this page in a minute or two; your downloads unlock as soon as it is confirmed.
            </div>
          )}

          {/* Signed out */}
          {!user && (
            <section className="card mx-auto max-w-xl p-8 text-center sm:p-12" aria-labelledby="signin-title">
              <div className="icon-tile mx-auto mb-5 h-12 w-12">
                <Lock className="h-6 w-6" />
              </div>
              <h1 id="signin-title" className="text-3xl font-medium tracking-tight text-slate-950 dark:text-white">
                Sign in
              </h1>
              <p className="mx-auto mt-3 max-w-md text-base text-slate-600 dark:text-slate-400">
                Sign in with Google to see your downloads and setup on any device. Your license is tied to your Google account.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <SignInButton className="btn btn-primary btn-lg w-full sm:w-auto">Sign in with Google</SignInButton>
                <Link href="/" className="btn btn-ghost btn-lg w-full sm:w-auto">
                  Back to home
                </Link>
              </div>
            </section>
          )}

          {/* Signed in */}
          {user && account && (
            <>
              <section className="card flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="account-title">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-lg font-medium text-white" aria-hidden="true">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <h1 id="account-title" className="truncate text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
                      Welcome, {name}
                    </h1>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">{account.email || user.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                  {account.purchased ? (
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      Lifetime license
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-sm font-medium text-amber-800 dark:text-amber-300">
                      No license yet
                    </span>
                  )}
                  {account.purchased && account.latestOrderId && (
                    <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      Order {account.latestOrderId.slice(-8)}
                    </span>
                  )}
                </div>
              </section>

              {!account.purchased && (
                <section className="card p-6 sm:p-8" aria-labelledby="buy-title">
                  <h2 id="buy-title" className="text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
                    Get lifetime access for $3
                  </h2>
                  <p className="mt-2 max-w-xl text-base text-slate-600 dark:text-slate-400">
                    One payment, no subscription.
                  </p>
                  <ul className="mt-5 grid gap-2.5 text-sm text-slate-700 sm:grid-cols-2 dark:text-slate-300">
                    {[
                      "Windows, macOS, Android and iOS apps",
                      "Text and image sync across your devices",
                      "AES-256-GCM encryption with your own key",
                      "All future updates",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <Check className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <form method="POST" action="/api/checkout_sessions" className="mt-7">
                    <button type="submit" className="btn btn-primary btn-lg w-full sm:w-auto">
                      Continue to checkout
                    </button>
                  </form>
                </section>
              )}

              <section className="card p-6 sm:p-8" aria-labelledby="downloads-title">
                <h2 id="downloads-title" className="text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
                  Downloads
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {account.purchased
                    ? "The app is named ClipSync on your device."
                    : "These unlock as soon as your purchase is complete."}
                </p>

                <ul className="mt-6 grid gap-4 sm:grid-cols-2">
                  {downloads.map(({ os, label, detail, badge, Icon }) => (
                    <li
                      key={os}
                      className={`card-inner relative flex flex-col gap-4 p-5 ${
                        account.purchased
                          ? "transition-colors hover:border-blue-400 focus-within:border-blue-400 dark:hover:border-blue-500"
                          : "opacity-70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="h-6 w-6 text-slate-700 dark:text-slate-300" aria-hidden="true" />
                        <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {badge}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-base font-medium text-slate-950 dark:text-white">{label}</h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{detail}</p>
                      </div>

                      {account.purchased ? (
                        <div className="mt-auto flex items-center justify-between text-sm">
                          {/* The whole card is the click target: the link stretches over it. */}
                          <a
                            href={`/api/download?os=${os}`}
                            className="focus-ring inline-flex items-center gap-1.5 rounded-md font-medium text-blue-700 after:absolute after:inset-0 after:content-[''] dark:text-blue-400"
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            Download
                          </a>
                          {(os === "android" || os === "ios") && <QrModalButton platform={os} />}
                        </div>
                      ) : (
                        <p className="mt-auto inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
                          <Lock className="h-4 w-4" aria-hidden="true" />
                          Locked
                        </p>
                      )}
                    </li>
                  ))}
                </ul>

                <p className="mt-5 text-sm text-slate-600 dark:text-slate-400">
                  iOS has no App Store or TestFlight build. Install the IPA with a sideloading tool such as AltStore or Sideloadly.
                </p>
              </section>

              {account.purchased && (
                <section className="card p-6 sm:p-8" aria-labelledby="setup-title">
                  <h2 id="setup-title" className="text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
                    How to link your devices
                  </h2>
                  <ol className="mt-6 grid gap-4 sm:grid-cols-3">
                    {steps.map(({ title, body }, i) => (
                      <li key={title} className="card-inner p-4">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
                          {i + 1}
                        </span>
                        <h3 className="mt-3 text-sm font-medium text-slate-950 dark:text-white">{title}</h3>
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{body}</p>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-6">
                    <ServerUrl />
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
