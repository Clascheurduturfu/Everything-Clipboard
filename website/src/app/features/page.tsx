import Link from "next/link";
import Image from "next/image";
import { Shield, Zap, Monitor, Network, Lock, Smartphone, Apple } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { UnicornBackground } from "@/components/UnicornBackground";

export default function Features() {
  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="aura-bg-blob-one absolute top-[-12%] left-[-12%] w-[52vw] h-[52vw] rounded-full bg-blue-400/20 dark:bg-blue-900/40 blur-[7.5rem] will-change-transform"></div>
        <div className="aura-bg-blob-two absolute bottom-[-18%] right-[-10%] w-[62vw] h-[62vw] rounded-full bg-sky-300/15 dark:bg-sky-900/30 blur-[8.75rem] will-change-transform"></div>
        <div className="aura-bg-blob-three absolute top-[36%] left-[36%] w-[30vw] h-[30vw] rounded-full bg-white/40 dark:bg-white/10 blur-[5rem] will-change-transform"></div>
        <div className="aura-bg-dots absolute inset-0 opacity-[0.4] dark:opacity-[0.1]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "2rem 2rem" }}></div>
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
        <div className="max-w-7xl mx-auto px-6 w-full space-y-16">
          
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-light tracking-tight text-slate-950 dark:text-white mb-6">
              Features & Capabilities
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 font-light leading-relaxed">
              Everything Clipboard is designed to seamlessly integrate into your workflow, providing unparalleled security, cross-platform capabilities, and flexible hosting options.
            </p>
          </div>

          {/* Hosting Flexibility Section */}
          <div className="glass-card rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/20 blur-3xl rounded-full pointer-events-none"></div>
            <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-950 dark:text-white mb-8 flex items-center gap-3">
               <Network className="w-8 h-8 text-emerald-500" /> Hosting Flexibility
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
               <div className="space-y-4">
                  <h3 className="text-xl font-medium text-slate-900 dark:text-white">Local Network</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                     Configure Everything Clipboard to sync exclusively over your local Wi-Fi. Your data never touches the internet, ensuring maximum privacy.
                  </p>
               </div>
               <div className="space-y-4">
                  <h3 className="text-xl font-medium text-slate-900 dark:text-white">Self-Hosted</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                     Deploy the server on your own infrastructure. You have complete control over the relay, ensuring zero third-party dependencies.
                  </p>
               </div>
               <div className="space-y-4">
                  <h3 className="text-xl font-medium text-slate-900 dark:text-white">Cloud Hosted</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                     Want a zero-setup experience? Use our hosted relay network. Everything remains fully encrypted, meaning we can never read your clipboard.
                  </p>
               </div>
            </div>
          </div>

          {/* Security & Cross Platform */}
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="glass-card rounded-[2.5rem] p-8 md:p-12">
               <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-950 dark:text-white mb-6 flex items-center gap-3">
                  <Lock className="w-8 h-8 text-blue-500" /> End-to-End Encryption
               </h2>
               <p className="text-base text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-6">
                  Security isn&apos;t an afterthought. With Everything Clipboard, your data is encrypted locally on your device before it ever leaves. 
                  You configure a custom encryption key across your devices. Without this key, the synchronized data is completely unreadable.
               </p>
               <div className="flex items-center gap-4 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-6 py-4 rounded-2xl border border-blue-100 dark:border-blue-800/50">
                  <Shield className="w-5 h-5" />
                  Military-grade AES encryption
               </div>
            </div>

            <div className="glass-card rounded-[2.5rem] p-8 md:p-12">
               <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-950 dark:text-white mb-6 flex items-center gap-3">
                  <Monitor className="w-8 h-8 text-purple-500" /> Cross-Platform
               </h2>
               <p className="text-base text-slate-600 dark:text-slate-400 font-light leading-relaxed mb-8">
                  Your workflow isn&apos;t limited to one operating system. Your clipboard shouldn&apos;t be either.
               </p>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <Monitor className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                     </div>
                     <span className="font-medium text-slate-900 dark:text-white">Windows 10 & 11</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <Apple className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                     </div>
                     <span className="font-medium text-slate-900 dark:text-white">macOS 12+ (Intel & Silicon)</span>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shadow-sm">
                        <Smartphone className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                     </div>
                     <span className="font-medium text-slate-900 dark:text-white">Android 8.0+</span>
                  </div>
               </div>
            </div>
          </div>

          {/* Roadmap */}
          <div className="glass-card rounded-[2.5rem] p-8 md:p-12 text-center border border-amber-200/50 dark:border-amber-800/50 bg-gradient-to-b from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
             <h2 className="text-2xl md:text-3xl font-medium tracking-tight text-slate-950 dark:text-white mb-4 flex items-center justify-center gap-3">
               <Zap className="w-8 h-8 text-amber-500" /> Coming Soon: Image Support
             </h2>
             <p className="text-base text-slate-600 dark:text-slate-400 font-light leading-relaxed max-w-2xl mx-auto">
                Currently, Everything Clipboard provides lightning-fast synchronization for all your text data. We are actively developing support for copying and pasting images across devices securely.
             </p>
          </div>

        </div>
      </main>
      
      <footer className="relative z-10 border-t border-slate-200/50 dark:border-slate-800/50 py-12 mt-auto glass-nav rounded-t-[2rem]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center space-x-2 opacity-80 hover:opacity-100 transition-opacity">
            <Image src="/logo.png" alt="Everything Clipboard Logo" width={24} height={24} className="rounded-md" />
            <span className="text-slate-900 dark:text-white font-medium tracking-wide">Everything Clipboard</span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-slate-500 dark:text-slate-400 font-light">
            <Link href="/support" className="hover:text-slate-900 dark:hover:text-white transition-colors">Support</Link>
            <span>&copy; {new Date().getFullYear()} Everything Clipboard. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
