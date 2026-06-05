import Link from "next/link";
import { AlertCircle, CheckCircle, Download, Monitor, Smartphone, Apple } from "lucide-react";
import { StoreCheckoutSession } from "@/components/DownloadAccessLink";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { UnicornBackground } from "@/components/UnicornBackground";
import { getPaidCheckoutSession } from "@/lib/stripe";

export default async function Success({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams;
  const sessionId = resolvedSearchParams.session_id as string | undefined;
  const paidSession = sessionId ? await getPaidCheckoutSession(sessionId) : null;
  const isPaid = Boolean(paidSession);

  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      {isPaid && sessionId && <StoreCheckoutSession sessionId={sessionId} />}

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="aura-bg-blob-one absolute top-[-12%] left-[-12%] w-[52vw] h-[52vw] rounded-full bg-emerald-400/20 dark:bg-emerald-900/40 blur-[7.5rem] will-change-transform"></div>
        <div className="aura-bg-blob-two absolute bottom-[-18%] right-[-10%] w-[62vw] h-[62vw] rounded-full bg-sky-300/15 dark:bg-sky-900/30 blur-[8.75rem] will-change-transform"></div>
        <div className="aura-bg-blob-three absolute top-[36%] left-[36%] w-[30vw] h-[30vw] rounded-full bg-white/40 dark:bg-white/10 blur-[5rem] will-change-transform"></div>
        <div className="aura-bg-dots absolute inset-0 opacity-[0.4] dark:opacity-[0.1]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "2rem 2rem" }}></div>
        
        {/* Interactive WebGL Background */}
        <UnicornBackground />
      </div>

      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pt-4 px-4 sm:px-6">
        <nav className="max-w-7xl mx-auto">
          <div className="glass-nav rounded-full px-6 py-3 flex justify-between items-center transition-all duration-300">
            <Link href="/" className="flex items-center space-x-3">
              <img src="/logo.png" alt="Everything Clipboard Logo" width="36" height="36" className="rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.3)]" />
              <span className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">Everything Clipboard</span>
            </Link>
            <div className="flex items-center space-x-6">
              <ThemeSwitcher />
              <Link href="/" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors">
                &larr; Back to Home
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex-grow pt-32 pb-24 lg:pt-40 lg:pb-32 flex flex-col items-center justify-center">
        <div className="max-w-3xl mx-auto px-6 w-full">
          <div className="glass-card rounded-[3rem] p-10 md:p-14 text-center">
            
            <div className="flex justify-center mb-8 relative">
              <div className={`${isPaid ? "bg-emerald-400/20 dark:bg-emerald-500/20" : "bg-amber-400/20 dark:bg-amber-500/20"} absolute inset-0 blur-2xl rounded-full`}></div>
              {isPaid ? (
                <CheckCircle className="h-24 w-24 text-emerald-500 relative z-10 animate-[bounce_1s_ease-in-out]" />
              ) : (
                <AlertCircle className="h-24 w-24 text-amber-500 relative z-10" />
              )}
            </div>
            
            <div>
              <h2 className="text-4xl md:text-5xl font-light tracking-tight text-slate-950 dark:text-white">
                {isPaid ? "Payment Successful!" : "Buy Everything Clipboard to Download"}
              </h2>
              <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 font-light max-w-xl mx-auto">
                {isPaid
                  ? "Thank you for purchasing Everything Clipboard. You now have full access to share your clipboard across all your devices. An email receipt has been sent to you."
                  : "Downloads are unlocked after a paid checkout. Please buy Everything Clipboard first, or return from Stripe using the link from your completed payment."}
              </p>
              {sessionId && (
                 <p className="mt-4 text-xs font-mono text-slate-400 dark:text-slate-500">Order Reference: {sessionId}</p>
              )}
            </div>

            {!isPaid && (
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <form action="/api/checkout_sessions" method="POST" className="w-full sm:w-auto">
                  <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-700 text-white text-sm font-medium shadow-[0_4px_14px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-blue-400 hover:to-blue-500 hover:-translate-y-0.5 transition-all duration-300">
                    Buy Everything Clipboard
                  </button>
                </form>
                <Link href="/support" className="text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                  Need help?
                </Link>
              </div>
            )}

            {isPaid && sessionId && (
            <div className="mt-12 border-t border-slate-200 dark:border-slate-800 pt-12">
              <h3 className="text-2xl font-medium text-slate-950 dark:text-white mb-8">Download Your Apps</h3>
              
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                
                {/* Windows Download */}
                <div className="group flex flex-col items-center p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Monitor className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-950 dark:text-white mb-1">Windows</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-light">Windows 10/11 (64-bit)</p>
                  <a href={`/api/download?os=windows&session_id=${encodeURIComponent(sessionId)}`} className="mt-auto w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-blue-200 dark:border-blue-800 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
                    <Download className="mr-2 h-4 w-4" /> Download
                  </a>
                </div>

                {/* MacOS Download */}
                <div className="group flex flex-col items-center p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Apple className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-950 dark:text-white mb-1">MacOS</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-light">macOS 12+ (Apple/Intel)</p>
                  <a href={`/api/download?os=macos&session_id=${encodeURIComponent(sessionId)}`} className="mt-auto w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-slate-300 dark:border-slate-600 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                    <Download className="mr-2 h-4 w-4" /> Download
                  </a>
                </div>

                {/* Android Download */}
                <div className="group flex flex-col items-center p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Smartphone className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-950 dark:text-white mb-1">Android</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-light">Android 8.0+ (.apk)</p>
                  <a href={`/api/download?os=android&session_id=${encodeURIComponent(sessionId)}`} className="mt-auto w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-emerald-200 dark:border-emerald-800 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors">
                    <Download className="mr-2 h-4 w-4" /> Download
                  </a>
                </div>

                {/* iOS Download */}
                <div className="group flex flex-col items-center p-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md rounded-[2rem] border border-slate-200 dark:border-slate-700 hover:-translate-y-1 transition-all duration-300">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 shadow-sm group-hover:scale-110 transition-transform">
                    <Apple className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-medium text-slate-950 dark:text-white mb-1">iOS</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 font-light">iOS 15.0+ (.ipa)</p>
                  <a href={`/api/download?os=ios&session_id=${encodeURIComponent(sessionId)}`} className="mt-auto w-full inline-flex items-center justify-center px-4 py-2.5 rounded-full border border-indigo-200 dark:border-indigo-800 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                    <Download className="mr-2 h-4 w-4" /> Download
                  </a>
                </div>

              </div>
            </div>
            )}
            
            <div className="pt-10">
               <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
                 &larr; Return to Home
               </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
