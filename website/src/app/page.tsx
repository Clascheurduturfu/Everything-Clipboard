import Image from "next/image";
import Link from "next/link";
import { Check, Monitor, Smartphone, MonitorUp, CreditCard, Shield } from "lucide-react";

export default function Home() {
  return (
    <main className="flex-grow flex flex-col bg-white">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">C</div>
          <span className="text-xl font-bold tracking-tight">ClipSync</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link href="/support" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            Support
          </Link>
          <form action="/api/checkout_sessions" method="POST">
            <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors shadow-sm">
              Buy Now - $3
            </button>
          </form>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-32">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 sm:static">
          <div className="sm:max-w-xl">
            <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 sm:text-6xl">
              One Clipboard. <br />
              <span className="text-blue-600">All Your Devices.</span>
            </h1>
            <p className="mt-6 text-xl text-gray-500">
              Copy on your Mac, paste on your Windows PC. Copy on your Android, paste anywhere. Seamlessly sync your clipboard across all your devices locally and securely.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <form action="/api/checkout_sessions" method="POST">
                <button type="submit" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-blue-600 border border-transparent rounded-full shadow-lg hover:bg-blue-700 hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Get ClipSync for $3
                </button>
              </form>
              <div className="flex items-center justify-center px-4 py-4 text-sm text-gray-500">
                <Shield className="w-4 h-4 mr-2 text-green-500" />
                Secure One-Time Payment
              </div>
            </div>
          </div>
          
          <div className="mt-14 lg:mt-0 lg:absolute lg:inset-y-0 lg:right-0 lg:w-1/2">
            <div className="relative h-[400px] w-full lg:h-full flex items-center justify-center">
               <div className="relative w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] lg:w-[500px] lg:h-[500px]">
                  {/* Floating App Images */}
                  <div className="absolute top-0 right-0 z-10 w-48 shadow-2xl rounded-xl overflow-hidden animate-[float_6s_ease-in-out_infinite] transform hover:scale-105 transition-transform duration-300">
                     <Image src="/MacOs app.png" alt="MacOS App" width={400} height={400} className="w-full h-auto" />
                  </div>
                  <div className="absolute bottom-10 left-0 z-20 w-48 shadow-2xl rounded-xl overflow-hidden animate-[float_6s_ease-in-out_infinite_1s] transform hover:scale-105 transition-transform duration-300">
                     <Image src="/Windows app.png" alt="Windows App" width={400} height={400} className="w-full h-auto" />
                  </div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 w-32 shadow-2xl rounded-3xl overflow-hidden border-4 border-gray-900 animate-[float_6s_ease-in-out_infinite_2s]">
                     <Image src="/Android app.png" alt="Android App" width={200} height={400} className="w-full h-auto object-cover" />
                  </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-24 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="sm:text-center mb-16">
            <h2 className="text-base text-blue-600 font-semibold tracking-wide uppercase">Features</h2>
            <p className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              A better way to work across devices
            </p>
          </div>

          <div className="mt-10 max-w-lg mx-auto grid gap-8 lg:grid-cols-3 lg:max-w-none">
            {/* Feature 1 */}
            <div className="flex flex-col rounded-2xl bg-white shadow-xl p-8 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 inline-flex items-center justify-center rounded-xl bg-blue-100 text-blue-600 mb-6">
                <Monitor className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Cross-Platform Sync</h3>
              <p className="text-gray-500 flex-grow">
                Seamlessly connects MacOS, Windows, and Android. Copy text or images on one device, paste on another instantly.
              </p>
            </div>
            {/* Feature 2 */}
            <div className="flex flex-col rounded-2xl bg-white shadow-xl p-8 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 inline-flex items-center justify-center rounded-xl bg-green-100 text-green-600 mb-6">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Secure & Private</h3>
              <p className="text-gray-500 flex-grow">
                Works locally on your network. Your clipboard data is encrypted and never leaves your local Wi-Fi.
              </p>
            </div>
            {/* Feature 3 */}
            <div className="flex flex-col rounded-2xl bg-white shadow-xl p-8 hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 inline-flex items-center justify-center rounded-xl bg-purple-100 text-purple-600 mb-6">
                <MonitorUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Lightweight & Fast</h3>
              <p className="text-gray-500 flex-grow">
                Designed to run silently in the background with minimal resource usage, ensuring your devices stay snappy.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-24 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to boost your productivity?</span>
            <span className="block text-blue-200 mt-2">Get all apps for a one-time payment of $3.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <form action="/api/checkout_sessions" method="POST">
              <button type="submit" className="inline-flex items-center justify-center px-8 py-4 border border-transparent text-lg font-medium rounded-full text-blue-600 bg-white hover:bg-gray-50 shadow-lg hover:scale-105 transition-all">
                Buy ClipSync Now
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">C</div>
            <span className="text-gray-900 font-semibold">ClipSync</span>
          </div>
          <div className="flex space-x-6 text-sm text-gray-500">
            <Link href="/support" className="hover:text-gray-900 transition-colors">Support & Contact</Link>
            <span>&copy; {new Date().getFullYear()} ClipSync. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}