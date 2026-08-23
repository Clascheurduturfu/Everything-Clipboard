import Link from "next/link";
import { CheckCircle2, Download, LockKeyhole, Monitor, Smartphone, Apple } from "lucide-react";
import { AccountActions } from "@/components/AccountActions";
import { PurchaseButton } from "@/components/PurchaseButton";
import { ServerUrl } from "@/components/ServerUrl";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { getAccountProfile } from "@/lib/entitlements";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const downloads = [
  { os: "windows", label: "Windows", detail: "Windows 10/11 (64-bit)", Icon: Monitor },
  { os: "macos", label: "macOS", detail: "macOS 12+ (Apple/Intel)", Icon: Apple },
  { os: "android", label: "Android", detail: "Android 8.0+ (.apk)", Icon: Smartphone },
  { os: "ios", label: "iOS", detail: "iOS 15.0+ (.ipa)", Icon: Apple },
];

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ purchase?: string }> }) {
  const user = await getSessionUser();
  const query = await searchParams;
  const account = user ? await getAccountProfile(user.uid) : null;

  return (
    <main className="min-h-screen px-6 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href="/" className="text-lg font-semibold text-slate-950 dark:text-white">Everything Clipboard</Link>
          <div className="flex items-center gap-5"><ThemeSwitcher />{user ? <AccountActions /> : <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400">Home</Link>}</div>
        </header>

        <section className="mt-12 rounded-3xl border border-slate-200 bg-white/75 p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950/60 sm:p-12">
          {!user && (
            <div className="max-w-xl">
              <LockKeyhole className="h-12 w-12 text-blue-600" />
              <h1 className="mt-6 text-4xl font-semibold text-slate-950 dark:text-white">Your ClipSync account</h1>
              <p className="mt-4 text-slate-600 dark:text-slate-400">Sign in with Google to purchase once, recover your downloads on any device, and keep your access tied to you.</p>
              <div className="mt-8"><PurchaseButton className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors" /></div>
            </div>
          )}

          {user && account && !account.purchased && (
            <div className="max-w-xl">
              <h1 className="text-4xl font-semibold text-slate-950 dark:text-white">Welcome, {account.displayName ?? "there"}</h1>
              <p className="mt-3 text-slate-600 dark:text-slate-400">Signed in as {account.email ?? user.email}. Your account is ready; one purchase unlocks ClipSync everywhere.</p>
              {query.purchase === "success" && <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Payment received. Your access will appear here as soon as Stripe confirms it.</p>}
              <div className="mt-8"><PurchaseButton buyLabel="Buy for $3" className="rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors" /></div>
            </div>
          )}

          {user && account?.purchased && (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="h-5 w-5" /> Lifetime access active</div>
                  <h1 className="mt-3 text-4xl font-semibold text-slate-950 dark:text-white">Your downloads are ready.</h1>
                  <p className="mt-3 text-slate-600 dark:text-slate-400">Signed in as {account.email ?? user.email}</p>
                </div>
                {account.latestOrderId && <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-slate-600 dark:bg-slate-900 dark:text-slate-300">Order {account.latestOrderId}</span>}
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {downloads.map(({ os, label, detail, Icon }) => (
                  <a key={os} href={`/api/download?os=${os}`} className="group rounded-2xl border border-slate-200 p-5 transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-slate-800 dark:hover:border-blue-800">
                    <Icon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    <h2 className="mt-5 font-semibold text-slate-950 dark:text-white">{label}</h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400"><Download className="h-4 w-4" /> Download</span>
                  </a>
                ))}
              </div>
              <ServerUrl />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
