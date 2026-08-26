import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Mail, HelpCircle, Shield, Sparkles, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { UnicornBackground } from "@/components/UnicornBackground";

export default function Support() {
  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      <Script
        async
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2851149974047726"
        crossOrigin="anonymous"
        strategy="afterInteractive"
      />

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

      <main className="relative z-10 flex-grow pt-28 pb-20 lg:pt-36 lg:pb-32 flex flex-col items-center">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full space-y-12">
          
          <div className="text-center max-w-2xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-slate-950 dark:text-white mb-4">
              Support & Help Center
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-light">
              Everything you need to know about your license, download recovery, encryption keys, and setup.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="glass-card rounded-[2.5rem] p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white flex items-center gap-2.5">
                <HelpCircle className="w-6 h-6 text-blue-500" />
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-6 text-sm text-slate-600 dark:text-slate-400">
                <div>
                  <h3 className="text-base font-semibold text-slate-950 dark:text-white mb-1">
                    How do I access my downloads on another device?
                  </h3>
                  <p className="font-light leading-relaxed">
                    Simply sign in with the same Google account on any device by clicking <strong>Account / Sign In</strong> in the top navigation. Your lifetime license is tied to your email.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-base font-semibold text-slate-950 dark:text-white mb-1">
                    Are my clipboard contents secure?
                  </h3>
                  <p className="font-light leading-relaxed">
                    Yes. Everything Clipboard is fully encrypted with a passphrase you choose. Data is encrypted on your local device before transmission. No one, not even our relay servers, can decrypt your text.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-base font-semibold text-slate-950 dark:text-white mb-1">
                    Is the \$3 price a one-time fee or a recurring subscription?
                  </h3>
                  <p className="font-light leading-relaxed">
                    It is a 100% one-time payment. You get lifetime access on Windows, macOS, Android, iOS, all future platform releases, and all feature updates without recurring charges.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-8 flex flex-col justify-between">
              <div className="glass-card rounded-[2.5rem] p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-6 shadow-sm">
                  <Mail className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white mb-3">
                  Direct Email Support
                </h2>
                <p className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Have a question, feedback, or need assistance with your purchase? Send us an email and include your receipt or account email.
                </p>
                <a
                  href="mailto:support@everything-clipboard.online"
                  className="inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-md hover:from-blue-500 hover:to-indigo-500 hover:-translate-y-0.5 transition-all duration-200"
                >
                  support@everything-clipboard.online
                </a>
              </div>

              <div className="glass-card rounded-[2.5rem] p-8 border border-slate-200/80 dark:border-slate-800 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-950 dark:text-white">
                      Guaranteed Security
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Zero-knowledge client encryption on all platforms.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Global Unified Footer */}
      <Footer />
    </div>
  );
}
