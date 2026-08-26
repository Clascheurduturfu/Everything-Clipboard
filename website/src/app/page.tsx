import Image from "next/image";
import Link from "next/link";
import { Monitor, MonitorUp, Shield, Zap, CheckCircle2, ClipboardCopy, ArrowRight } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PurchaseButton } from "@/components/PurchaseButton";
import { UnicornBackground } from "@/components/UnicornBackground";
import OrbitImages from "@/components/OrbitImages";

export default function Home() {
  return (
    <div className="relative z-10 flex flex-col min-h-screen">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="aura-bg-blob-one absolute top-[-12%] left-[-12%] w-[52vw] h-[52vw] rounded-full bg-blue-400/20 dark:bg-blue-900/40 blur-[7.5rem] will-change-transform" />
        <div className="aura-bg-blob-two absolute bottom-[-18%] right-[-10%] w-[62vw] h-[62vw] rounded-full bg-sky-300/15 dark:bg-sky-900/30 blur-[8.75rem] will-change-transform" />
        <div className="aura-bg-blob-three absolute top-[36%] left-[36%] w-[30vw] h-[30vw] rounded-full bg-white/40 dark:bg-white/10 blur-[5rem] will-change-transform" />
        <div className="aura-bg-dots absolute inset-0 opacity-[0.4] dark:opacity-[0.1]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "2rem 2rem" }} />
        {/* Interactive WebGL Background */}
        <UnicornBackground />
      </div>

      {/* Global Unified Navigation */}
      <Navbar />

      {/* Hero Section */}
      <main className="relative z-10 flex-grow pt-28 pb-20 lg:pt-36 lg:pb-32 flex flex-col items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full grid lg:grid-cols-[1.02fr_0.98fr] gap-12 lg:gap-16 items-center">
          
          {/* Hero Text */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-md border border-white dark:border-slate-700 px-3.5 py-2 shadow-sm mb-6 sm:mb-8">
              <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </span>
              <span className="font-mono text-xs font-medium tracking-wide text-slate-600 dark:text-slate-300 uppercase">
                Sync at the speed of thought
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-6xl md:text-7xl font-light tracking-[-0.04em] text-slate-950 dark:text-white leading-[1.1] mb-6">
              <span className="block">One Clipboard.</span>
              <span className="block mt-2 font-medium text-gradient">All Your Devices.</span>
            </h1>
            
            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 font-light leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Copy on your Mac, paste on your Windows PC. Copy on your Android, paste anywhere. Fully encrypted text sync with a custom key. Host yourself, locally, or let us host it.
            </p>
            
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <PurchaseButton 
                buyLabel="Buy for $3" 
                downloadLabel="Download Everything Clipboard" 
              />
              <div className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md px-6 py-4 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm w-full sm:w-auto">
                <Shield className="w-5 h-5 text-emerald-500" />
                One-Time Payment
              </div>
            </div>
            
            <div className="mt-8 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs text-slate-500 dark:text-slate-400 font-light">
               <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Works Locally</span>
               <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
               <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500" /> End-to-End Encrypted</span>
               <span className="hidden sm:block w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
               <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Lifetime Updates</span>
            </div>
          </div>
          
          {/* Hero Images Showcase */}
          <div className="relative lg:pl-4 mt-6 lg:mt-0">
            <div className="absolute -inset-8 rounded-[3rem] bg-gradient-to-br from-blue-200/40 via-white/20 to-sky-200/30 dark:from-blue-900/40 dark:via-slate-800/20 dark:to-sky-900/30 blur-3xl" />
            
            <div className="relative rounded-[2rem] glass-card p-4 sm:p-5 h-[380px] sm:h-[480px] lg:h-[580px] flex items-center justify-center overflow-hidden">
              
              {/* Floating Bubbles (Aura style) */}
              <div className="hidden md:block absolute inset-0 z-30 pointer-events-none">
                <div className="aura-float-bubble absolute -right-4 top-10 pointer-events-auto rounded-2xl glass-card px-4 py-3 min-w-[12rem] cursor-pointer transition-transform duration-300 hover:scale-110 hover:shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                      <ClipboardCopy className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-900 dark:text-white font-medium">Text Copied</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Available on all devices</p>
                    </div>
                  </div>
                </div>
                
                <div className="aura-float-bubble absolute left-4 bottom-[20%] pointer-events-auto rounded-2xl glass-card px-4 py-3 min-w-[12rem] cursor-pointer transition-transform duration-300 hover:scale-110 hover:shadow-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-slate-900 dark:text-white font-medium">Encrypted</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Zero-Knowledge</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Apps - Orbiting with React Bits Component */}
              <div className="relative w-full max-w-[500px] sm:max-w-[600px] h-full flex items-center justify-center">
                 <OrbitImages
                    radiusX={220}
                    radiusY={100}
                    rotation={-15}
                    duration={45}
                    itemSize={280}
                    responsive={true}
                    baseWidth={600}
                    items={[
                      <div key="ios" className="rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-slate-900 dark:ring-slate-800 bg-slate-900 transition-transform duration-500 hover:scale-110 cursor-pointer pointer-events-auto w-[160px] sm:w-[180px] mx-auto">
                        <Image src="/IOS app.png" alt="iOS App" width={300} height={600} className="w-full h-auto object-cover pointer-events-none" priority />
                      </div>,
                      <div key="android" className="rounded-[2rem] overflow-hidden shadow-2xl ring-4 ring-slate-900 dark:ring-slate-800 bg-slate-900 transition-transform duration-500 hover:scale-110 cursor-pointer pointer-events-auto w-[160px] sm:w-[180px] mx-auto">
                        <Image src="/Android app.png" alt="Android App" width={300} height={600} className="w-full h-auto object-cover pointer-events-none" priority />
                      </div>,
                      <div key="mac" className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900 transition-transform duration-500 hover:scale-110 hover:z-40 cursor-pointer pointer-events-auto w-[250px] mx-auto">
                        <Image src="/MacOs app.png" alt="MacOS App" width={600} height={600} className="w-full h-auto pointer-events-none" priority />
                      </div>,
                      <div key="windows" className="rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-900 transition-transform duration-500 hover:scale-110 hover:z-40 cursor-pointer pointer-events-auto w-[250px] mx-auto">
                        <Image src="/Windows app.png" alt="Windows App" width={600} height={600} className="w-full h-auto pointer-events-none" priority />
                      </div>
                    ]}
                 />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative z-10 py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="font-mono text-xs font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-3">
              Core Capabilities
            </h2>
            <p className="text-3xl md:text-5xl font-light tracking-tight text-slate-950 dark:text-white max-w-2xl mx-auto">
              Everything you need. <br/><span className="font-normal text-slate-500 dark:text-slate-400">Nothing you don&apos;t.</span>
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="group flex flex-col gap-4 rounded-[2rem] glass-card p-8 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
                <Monitor className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-slate-950 dark:text-white mb-3">Cross-Platform</h3>
                <p className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed">
                  Seamlessly connects MacOS, Windows, Android, and iOS. Copy text on one device, paste on another instantly.
                </p>
              </div>
            </div>
            
            {/* Feature 2 */}
            <div className="group flex flex-col gap-4 rounded-[2rem] glass-card p-8 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-slate-950 dark:text-white mb-3">Encrypted & Flexible</h3>
                <p className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed">
                  Fully encrypted with a key you choose. Host the server yourself, configure for local networks, or let us host it securely.
                </p>
              </div>
            </div>
            
            {/* Feature 3 */}
            <div className="group flex flex-col gap-4 rounded-[2rem] glass-card p-8 hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 border border-purple-100 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-sm">
                <MonitorUp className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-slate-950 dark:text-white mb-3">Images Coming Soon</h3>
                <p className="text-sm font-light text-slate-600 dark:text-slate-400 leading-relaxed">
                  Currently syncs all your text effortlessly. We&apos;re actively developing support for image synchronization in a future update!
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-16 sm:py-24 mb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="glass-card rounded-[3rem] p-8 sm:p-14 relative overflow-hidden border border-blue-200/60 dark:border-blue-900/60 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 dark:from-blue-500/20 dark:to-purple-500/20 pointer-events-none" />
            <h2 className="text-3xl md:text-5xl font-light tracking-tight text-slate-950 dark:text-white mb-4 sm:mb-6">
              Ready to boost your productivity?
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-xl mx-auto font-light">
              Get all apps for a one-time payment of $3. No subscriptions, no renewals, all future updates included.
            </p>
            <PurchaseButton 
              buyLabel="Get Lifetime Access – $3" 
              downloadLabel="Download Everything Clipboard"
              className="inline-flex items-center justify-center gap-2 px-10 py-5 text-base sm:text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:from-blue-500 hover:to-indigo-500 hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer" 
            />
          </div>
        </div>
      </section>

      {/* Global Unified Footer */}
      <Footer />
    </div>
  );
}
