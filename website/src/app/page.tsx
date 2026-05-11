import Image from "next/image";
import Link from "next/link";
import { Monitor, MonitorUp, CreditCard, Shield, Zap, CheckCircle2 } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative selection:bg-blue-100">
      {/* Background Soft Gradients for Light Theme */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-100/50 rounded-full blur-[100px] -z-10 opacity-70 pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 glass-nav">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-md">C</div>
            <span className="text-xl font-bold tracking-tight text-slate-900">ClipSync</span>
          </div>
          <div className="flex items-center space-x-6">
            <Link href="/support" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Support
            </Link>
            <form action="/api/checkout_sessions" method="POST">
              <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-full transition-all duration-300 shadow-sm">
                Get ClipSync
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-grow pt-32 pb-24 lg:pt-48 lg:pb-32 flex flex-col items-center overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-8">
          
          {/* Hero Text */}
          <div className="w-full lg:w-1/2 text-center lg:text-left z-10 flex flex-col items-center lg:items-start">
            <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-medium mb-8 shadow-sm">
              <Zap className="w-4 h-4" />
              <span>Sync at the speed of thought</span>
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-7xl mb-6 leading-[1.1]">
              One Clipboard. <br />
              <span className="text-gradient">All Your Devices.</span>
            </h1>
            <p className="mt-4 text-xl text-slate-600 font-light leading-relaxed max-w-2xl">
              Copy on your Mac, paste on your Windows PC. Copy on your Android, paste anywhere. Seamlessly sync your clipboard locally and securely.
            </p>
            
            <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <form action="/api/checkout_sessions" method="POST" className="w-full sm:w-auto">
                <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-300 group">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Buy for $3
                </button>
              </form>
              <div className="flex items-center text-sm font-medium text-slate-500 bg-white px-4 py-3 rounded-full border border-slate-200 shadow-sm">
                <Shield className="w-4 h-4 mr-2 text-emerald-500" />
                One-Time Payment
              </div>
            </div>
            
            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
               <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5 text-blue-500" /> Works Locally</div>
               <div className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1.5 text-blue-500" /> End-to-End Encrypted</div>
            </div>
          </div>
          
          {/* Hero Images - Much larger as requested */}
          <div className="w-full lg:w-1/2 flex justify-center lg:justify-end relative h-[400px] sm:h-[500px] lg:h-[600px] z-10 mt-10 lg:mt-0">
             <div className="relative w-full max-w-[500px] sm:max-w-[600px] lg:max-w-[700px] h-full flex items-center justify-center">
                {/* Floating App Images */}
                <div className="absolute top-[5%] right-[0%] z-10 w-[60%] sm:w-[50%] rounded-2xl overflow-hidden animate-[float_6s_ease-in-out_infinite] shadow-2xl border border-slate-200/50 bg-white">
                   <Image src="/MacOs app.png" alt="MacOS App" width={600} height={600} className="w-full h-auto" priority />
                </div>
                <div className="absolute bottom-[10%] left-[0%] z-20 w-[60%] sm:w-[50%] rounded-2xl overflow-hidden animate-[float_7s_ease-in-out_infinite_1s] shadow-2xl border border-slate-200/50 bg-white">
                   <Image src="/Windows app.png" alt="Windows App" width={600} height={600} className="w-full h-auto" priority />
                </div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 w-[35%] sm:w-[30%] rounded-[2rem] overflow-hidden shadow-2xl animate-[float-delayed_5s_ease-in-out_infinite_2s] ring-4 ring-slate-900 bg-slate-900">
                   <Image src="/Android app.png" alt="Android App" width={300} height={600} className="w-full h-auto object-cover" priority />
                </div>
             </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="relative py-24 sm:py-32 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-bold tracking-widest text-blue-600 uppercase mb-3">Core Features</h2>
            <p className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need. Nothing you don't.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="glass-card rounded-3xl p-8 flex flex-col hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 mb-6">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Cross-Platform</h3>
              <p className="text-slate-600 leading-relaxed flex-grow">
                Seamlessly connects MacOS, Windows, and Android. Copy text or images on one device, paste on another instantly.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="glass-card rounded-3xl p-8 flex flex-col hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Secure & Private</h3>
              <p className="text-slate-600 leading-relaxed flex-grow">
                Works locally on your network. Your clipboard data is encrypted and never leaves your local Wi-Fi.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="glass-card rounded-3xl p-8 flex flex-col hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600 mb-6">
                <MonitorUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Lightweight</h3>
              <p className="text-slate-600 leading-relaxed flex-grow">
                Designed to run silently in the background with minimal resource usage, ensuring your devices stay snappy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/50 to-purple-900/50" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl mb-6">
            Ready to boost your productivity?
          </h2>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            Get all apps for a one-time payment of $3. No subscriptions, no hidden fees.
          </p>
          <form action="/api/checkout_sessions" method="POST" className="inline-block">
            <button type="submit" className="inline-flex items-center justify-center px-10 py-5 text-lg font-bold text-slate-900 bg-white rounded-full shadow-xl hover:scale-105 transition-all duration-300">
              Buy ClipSync Now
              <Zap className="w-5 h-5 ml-2 text-blue-600" />
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 w-full mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">C</div>
            <span className="text-slate-900 font-semibold tracking-wide">ClipSync</span>
          </div>
          <div className="flex items-center space-x-6 text-sm text-slate-500">
            <Link href="/support" className="hover:text-slate-900 transition-colors">Support</Link>
            <span>&copy; {new Date().getFullYear()} ClipSync. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
