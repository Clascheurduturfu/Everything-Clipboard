import Link from "next/link";
import { 
  CheckCircle2, 
  Download, 
  Lock, 
  Monitor, 
  Smartphone, 
  Apple, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight,
  ExternalLink,
  HelpCircle
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ServerUrl } from "@/components/ServerUrl";
import { AndroidQrModal } from "@/components/AndroidQrModal";
import { PurchaseButton } from "@/components/PurchaseButton";
import { UnicornBackground } from "@/components/UnicornBackground";
import { getAccountProfile } from "@/lib/entitlements";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const downloads = [
  { 
    os: "windows", 
    label: "Windows", 
    detail: "Windows 10 / 11 (64-bit .exe)", 
    Icon: Monitor,
    color: "from-blue-500/20 to-sky-500/20",
    badge: "Installer"
  },
  { 
    os: "macos", 
    label: "macOS", 
    detail: "macOS 12+ (Apple Silicon & Intel)", 
    Icon: Apple,
    color: "from-purple-500/20 to-indigo-500/20",
    badge: "Universal DMG"
  },
  { 
    os: "android", 
    label: "Android", 
    detail: "Android 8.0+ (.apk package)", 
    Icon: Smartphone,
    color: "from-emerald-500/20 to-teal-500/20",
    badge: "Direct APK"
  },
  { 
    os: "ios", 
    label: "iOS", 
    detail: "TestFlight Preview", 
    Icon: Apple,
    color: "from-slate-500/20 to-slate-600/20",
    badge: "Roadmap",
    disabled: true
  },
];

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ purchase?: string; session_id?: string }> }) {
  const user = await getSessionUser();
  const query = await searchParams;
  const account = user ? await getAccountProfile(user.uid) : null;

  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="aura-bg-blob-one absolute top-[-12%] left-[-12%] w-[52vw] h-[52vw] rounded-full bg-blue-400/20 dark:bg-blue-900/40 blur-[7.5rem] will-change-transform" />
        <div className="aura-bg-blob-two absolute bottom-[-18%] right-[-10%] w-[62vw] h-[62vw] rounded-full bg-sky-300/15 dark:bg-sky-900/30 blur-[8.75rem] will-change-transform" />
        <div className="aura-bg-blob-three absolute top-[36%] left-[36%] w-[30vw] h-[30vw] rounded-full bg-white/40 dark:bg-white/10 blur-[5rem] will-change-transform" />
        <div className="aura-bg-dots absolute inset-0 opacity-[0.4] dark:opacity-[0.1]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "2rem 2rem" }} />
        <UnicornBackground />
      </div>

      {/* Global Unified Navigation */}
      <Navbar />

      <main className="relative z-10 flex-grow pt-28 pb-24 lg:pt-36 lg:pb-32 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          
          {/* STATE 1: Unauthenticated */}
          {!user && (
            <div className="glass-card rounded-[2.5rem] p-8 sm:p-14 text-center max-w-2xl mx-auto relative overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-2xl">
              <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 mx-auto flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-md">
                <Lock className="w-8 h-8" />
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white mb-4">
                Sign in to your Account
              </h1>
              <p className="text-base text-slate-600 dark:text-slate-400 font-light leading-relaxed max-w-lg mx-auto mb-8">
                Sign in with Google to unlock or access your downloads on any device, manage your server settings, and keep your lifetime license permanently tied to your email.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <PurchaseButton 
                  buyLabel="Sign In with Google" 
                  showIcon={false}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-base font-semibold shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
                />
                <Link
                  href="/"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-4 rounded-full border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Return to Home
                </Link>
              </div>
            </div>
          )}

          {/* Success Banner if redirected after Stripe checkout */}
          {query.purchase === "success" && (
            <div className="rounded-3xl bg-emerald-500/10 border border-emerald-500/30 p-6 text-emerald-800 dark:text-emerald-300 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <CheckCircle2 className="w-6 h-6 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="text-base font-semibold">Payment Successful! Welcome to Lifetime Access.</h3>
                <p className="text-xs sm:text-sm text-emerald-700/90 dark:text-emerald-400/90 mt-1">
                  Your payment has been processed. Your downloads and relay server credentials are now unlocked below.
                </p>
              </div>
            </div>
          )}

          {/* STATE 2: Logged In — NOT Purchased */}
          {user && account && !account.purchased && (
            <div className="space-y-8">
              {/* Profile Card */}
              <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                    {account.displayName ? account.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
                      Welcome, {account.displayName || "there"}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Signed in as {account.email || user.email}
                    </p>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-xs font-semibold tracking-wide">
                  Free Tier / Unlicensed
                </span>
              </div>

              {/* Upgrade Hero Card */}
              <div className="glass-card rounded-[2.5rem] p-8 sm:p-12 border border-blue-200/80 dark:border-blue-900/80 bg-gradient-to-br from-blue-500/5 via-indigo-500/5 to-purple-500/5 relative overflow-hidden shadow-xl">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-semibold mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    One-Time Purchase • Lifetime License
                  </div>
                  <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white mb-4">
                    Unlock ClipSync Everywhere for <span className="text-gradient">$3</span>
                  </h2>
                  <p className="text-base text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-8">
                    Get full unlimited access to Windows, macOS, and Android apps, our low-latency encrypted cloud relay, or self-hosting support. No subscriptions, ever.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-3 mb-8 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Unlimited devices sync
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      Windows, Mac & Android apps
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      AES End-to-end encryption
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      All future updates included
                    </div>
                  </div>

                  <form method="POST" action="/api/checkout_sessions">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-base shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 active:scale-95 transition-all cursor-pointer"
                    >
                      <Sparkles className="w-5 h-5" />
                      Proceed to Checkout ($3)
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Locked App Previews */}
              <div className="glass-card rounded-[2.5rem] p-8 border border-slate-200/80 dark:border-slate-800">
                <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">
                  Available Applications
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Downloads will unlock immediately after completing your lifetime purchase.
                </p>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {downloads.map(({ os, label, detail, Icon, badge }) => (
                    <div
                      key={os}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 bg-white/40 dark:bg-slate-900/40 relative opacity-75"
                    >
                      <div className="flex items-center justify-between">
                        <Icon className="h-7 w-7 text-slate-600 dark:text-slate-400" />
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {badge}
                        </span>
                      </div>
                      <h4 className="mt-4 font-semibold text-slate-950 dark:text-white">{label}</h4>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
                      <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-amber-500" />
                        Locked
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STATE 3: Logged In — BOUGHT (Lifetime License Active) */}
          {user && account?.purchased && (
            <div className="space-y-8">
              {/* Profile Card */}
              <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-md">
                    {account.displayName ? account.displayName.charAt(0).toUpperCase() : user.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                      <ShieldCheck className="w-4 h-4" />
                      Lifetime License Active
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 dark:text-white">
                      Welcome, {account.displayName || "there"}
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Account email: {account.email || user.email}
                    </p>
                  </div>
                </div>

                {account.latestOrderId && (
                  <span className="rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3.5 py-2 font-mono text-xs text-slate-600 dark:text-slate-400">
                    Order #{account.latestOrderId.slice(-8)}
                  </span>
                )}
              </div>

              {/* Download Hub */}
              <div className="glass-card rounded-[2.5rem] p-6 sm:p-10 border border-slate-200/80 dark:border-slate-800 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                      Download Apps
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                      Install Everything Clipboard across all your computers and mobile devices.
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {downloads.map(({ os, label, detail, Icon, badge, disabled }) => {
                    const downloadUrl = `/api/download?os=${os}`;

                    if (disabled) {
                      return (
                        <div
                          key={os}
                          className="rounded-2xl border border-slate-200/60 dark:border-slate-800/60 p-5 bg-slate-50/40 dark:bg-slate-900/30 opacity-60 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <Icon className="h-7 w-7 text-slate-500" />
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                                {badge}
                              </span>
                            </div>
                            <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">{label}</h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
                          </div>
                          <span className="mt-6 text-xs text-slate-400 font-medium">Coming Soon</span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={os}
                        className="group rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 bg-white/60 dark:bg-slate-900/60 transition-all duration-200 hover:-translate-y-1 hover:border-blue-400 hover:shadow-xl flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <Icon className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                              {badge}
                            </span>
                          </div>
                          <h3 className="mt-4 font-semibold text-slate-950 dark:text-white">{label}</h3>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                          <a
                            href={downloadUrl}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:underline"
                          >
                            <Download className="h-4 w-4" />
                            Download
                          </a>

                          {os === "android" && (
                            <AndroidQrModal downloadUrl={typeof window !== "undefined" ? `${window.location.origin}${downloadUrl}` : downloadUrl} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Relay Server Connection Box */}
                <ServerUrl />
              </div>

              {/* Quick Setup Instructions */}
              <div className="glass-card rounded-[2.5rem] p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800">
                <h3 className="text-lg font-bold text-slate-950 dark:text-white mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-blue-500" />
                  How to link your devices
                </h3>
                <ol className="grid sm:grid-cols-3 gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <li className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-2">1</span>
                    <strong className="text-slate-900 dark:text-white block mb-1">Install the Apps</strong>
                    Download and open Everything Clipboard on your Mac, Windows PC, and Android phone.
                  </li>
                  <li className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-2">2</span>
                    <strong className="text-slate-900 dark:text-white block mb-1">Connect to Relay</strong>
                    Paste the server URL <code className="text-[11px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">wss://serv.everything-clipboard.com</code> into each app.
                  </li>
                  <li className="p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center mb-2">3</span>
                    <strong className="text-slate-900 dark:text-white block mb-1">Set Your Passphrase</strong>
                    Enter your custom encryption key on all devices. You&apos;re now syncing securely!
                  </li>
                </ol>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Global Unified Footer */}
      <Footer />
    </div>
  );
}
