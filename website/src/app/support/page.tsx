import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
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
        <div className="aura-bg-blob-one absolute top-[-12%] left-[-12%] w-[52vw] h-[52vw] rounded-full bg-blue-400/20 dark:bg-blue-900/40 blur-[7.5rem] will-change-transform"></div>
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
              <Image src="/logo.png" alt="Everything Clipboard Logo" width={36} height={36} className="rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.3)]" />
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

      <main className="relative z-10 flex-grow pt-32 pb-24 lg:pt-40 lg:pb-32 flex flex-col items-center">
        <div className="max-w-7xl mx-auto px-6 w-full flex flex-col lg:flex-row gap-8">
          
          {/* Main Content Area */}
          <div className="flex-grow lg:w-2/3 space-y-8">
          
          <div className="glass-card rounded-[2rem] p-8">
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-slate-950 dark:text-white mb-8">Support & FAQ</h1>
            
            <div className="space-y-8">
              <div>
                <h3 className="text-xl font-medium text-slate-950 dark:text-white mb-2">How do I download the app after purchase?</h3>
                <p className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed">After completing your payment via Stripe, you will be redirected to a success page containing the download links for MacOS, Windows, and Android. You will also receive an email receipt.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-slate-950 dark:text-white mb-2">Are my clipboard contents secure?</h3>
                <p className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed">Yes. Everything Clipboard is fully encrypted with a key that you choose. You can configure it for your local network, host your own server, or let us host it securely for you.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-slate-950 dark:text-white mb-2">I need help setting it up.</h3>
                <p className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed">Start by choosing your hosting setup: self-hosted on your own infrastructure, local-only configuration for privacy, or our fully encrypted relay network for zero-setup syncing.</p>
              </div>
              
              <div>
                <h3 className="text-xl font-medium text-slate-950 dark:text-white mb-2">Can I sync images or files?</h3>
                <p className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed">Currently, Everything Clipboard supports seamless text synchronization. We are actively exploring image support for a future update!</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[2rem] p-8">
             <h2 className="text-2xl md:text-3xl font-light tracking-tight text-slate-950 dark:text-white mb-4">Contact Us</h2>
             <p className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed mb-8">If you have any questions, send us your message and include your Stripe receipt email if it is about a purchase.</p>
             <a
               href="mailto:support@everything-clipboard.online"
               className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-700 text-white text-sm font-medium shadow-[0_4px_14px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:from-blue-400 hover:to-blue-500 hover:-translate-y-0.5 transition-all duration-300"
             >
               support@everything-clipboard.online
             </a>
          </div>
          </div>
        </div>
      </main>
    </div>
  );
}
