import Image from "next/image";
import Link from "next/link";
import { Monitor, MonitorUp, CreditCard, Shield, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-grow flex flex-col min-h-screen relative selection:bg-blue-500/30">
      {/* Background Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] animate-[pulse-glow_8s_ease-in-out_infinite] -z-10" />
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] rounded-full bg-purple-600/20 blur-[120px] animate-[pulse-glow_10s_ease-in-out_infinite_1s] -z-10" />
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px] animate-[pulse-glow_9s_ease-in-out_infinite_2s] -z-10" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/20">C</div>
            <span className="text-xl font-bold tracking-tight text-white">ClipSync</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/support" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
              Support
            </Link>
            <form action="/api/checkout_sessions" method="POST">
              <button type="submit" className="px-5 py-2 text-sm font-medium text-white bg-white/10 hover:bg-white/20 border border-white/10 rounded-full transition-all duration-300 shadow-sm backdrop-blur-md">
                Buy Now - $3
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex-grow flex flex-col justify-center">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col lg:flex-row items-center">
          <div className="sm:max-w-xl text-center lg:text-left z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              <span>The missing link for your devices</span>
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-white sm:text-7xl mb-6">
              One Clipboard. <br />
              <span className="text-gradient">All Your Devices.</span>
            </h1>
            <p className="mt-4 text-xl text-zinc-400 font-light leading-relaxed">
              Copy on your Mac, paste on your Windows PC. Copy on your Android, paste anywhere. Seamlessly sync your clipboard locally and securely.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-5 justify-center lg:justify-start">
              <form action="/api/checkout_sessions" method="POST" className="w-full sm:w-auto">
                <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-blue-600 hover:bg-blue-500 rounded-full shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 focus:ring-blue-500 group">
                  <CreditCard className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                  Get ClipSync for $3
                </button>
              </form>
              <div className="flex items-center text-sm text-zinc-500">
                <Shield className="w-4 h-4 mr-2 text-emerald-500/80" />
                Secure One-Time Payment
              </div>
            </div>
          </div>
          
          <div className="mt-20 lg:mt-0 lg:w-1/2 flex justify-center lg:justify-end relative w-full h-[400px] lg:h-[500px] z-10 perspective-1000">
             <div className="relative w-full max-w-[500px] h-full flex items-center justify-center">
                {/* Floating App Images */}
                <div className="absolute top-[5%] right-[5%] z-10 w-[45%] rounded-xl overflow-hidden animate-[float_7s_ease-in-out_infinite] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 backdrop-blur-xl bg-zinc-900/50">
                   <Image src="/MacOs app.png" alt="MacOS App" width={400} height={400} className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute bottom-[10%] left-[5%] z-20 w-[45%] rounded-xl overflow-hidden animate-[float_8s_ease-in-out_infinite_1s] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 ring-1 ring-white/5 backdrop-blur-xl bg-zinc-900/50">
                   <Image src="/Windows app.png" alt="Windows App" width={400} height={400} className="w-full h-auto opacity-90 hover:opacity-100 transition-opacity" />
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 w-[30%] rounded-3xl overflow-hidden border border-white/20 shadow-[0_0_60px_rgba(0,0,0,0.8)] animate-[float_6s_ease-in-out_infinite_2s] ring-4 ring-zinc-950 bg-zinc-950">
                   <Image src="/Android app.png" alt="Android App" width={200} height={400} className="w-full h-auto object-cover opacity-95 hover:opacity-100 transition-opacity" />
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="relative py-24 sm:py-32 border-t border-white/5 bg-zinc-950/50 backdrop-blur-sm z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-semibold tracking-widest text-blue-500 uppercase mb-3">Core Features</h2>
            <p className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              A better way to work across devices
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 max-w-lg mx-auto lg:max-w-none">
            {/* Feature 1 */}
            <div className="glass-card rounded-3xl p-8 flex flex-col hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-2 group">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
                <Monitor className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Cross-Platform Sync</h3>
              <p className="text-zinc-400 leading-relaxed flex-grow">
                Seamlessly connects MacOS, Windows, and Android. Copy text or images on one device, paste on another instantly.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="glass-card rounded-3xl p-8 flex flex-col hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-2 group">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
                <Shield className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Secure & Private</h3>
              <p className="text-zinc-400 leading-relaxed flex-grow">
                Works locally on your network. Your clipboard data is encrypted and never leaves your local Wi-Fi.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="glass-card rounded-3xl p-8 flex flex-col hover:bg-white/[0.05] transition-all duration-300 hover:-translate-y-2 group">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 group-hover:bg-purple-500/20 transition-all">
                <MonitorUp className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-white mb-4">Lightweight & Fast</h3>
              <p className="text-zinc-400 leading-relaxed flex-grow">
                Designed to run silently in the background with minimal resource usage, ensuring your devices stay snappy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="relative border-t border-white/5 py-24 z-10 overflow-hidden">
        <div className="absolute inset-0 bg-blue-600/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-blue-500/10 blur-[100px] rounded-full -z-10" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl mb-6">
            Ready to boost your productivity?
          </h2>
          <p className="text-xl text-zinc-400 mb-10">
            Get all apps for a one-time payment of $3. No subscriptions, no hidden fees.
          </p>
          <form action="/api/checkout_sessions" method="POST" className="inline-block">
            <button type="submit" className="inline-flex items-center justify-center px-10 py-5 text-lg font-medium text-zinc-950 bg-white rounded-full shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] hover:scale-105 transition-all duration-300 group">
              Buy ClipSync Now
              <Zap className="w-5 h-5 ml-2 group-hover:text-blue-600 transition-colors" />
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-zinc-950/80 backdrop-blur-md relative z-10 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-xs">C</div>
            <span className="text-white font-semibold tracking-wide">ClipSync</span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-zinc-500">
            <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            <span>&copy; {new Date().getFullYear()} ClipSync. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
