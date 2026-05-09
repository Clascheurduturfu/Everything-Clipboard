import Link from "next/link";
import Script from "next/script";

export default function Support() {
  return (
    <main className="flex-grow flex flex-col bg-gray-50 min-h-screen">
      {/* Navigation */}
      <nav className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center bg-white shadow-sm">
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">C</div>
          <span className="text-xl font-bold tracking-tight text-gray-900">ClipSync</span>
        </Link>
        <Link href="/" className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
          &larr; Back to Home
        </Link>
      </nav>

      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 flex-grow flex flex-col lg:flex-row gap-8">
        
        {/* Main Content Area */}
        <div className="flex-grow lg:w-2/3 space-y-8">
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-6">Support & FAQ</h1>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">How do I download the app after purchase?</h3>
                <p className="mt-2 text-gray-600">After completing your payment via Stripe, you will be redirected to a success page containing the download links for MacOS, Windows, and Android. You will also receive an email receipt.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-gray-900">Are my clipboard contents secure?</h3>
                <p className="mt-2 text-gray-600">Yes! ClipSync works entirely on your local network. Your clipboard data is encrypted during transfer and never leaves your Wi-Fi, ensuring total privacy.</p>
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-gray-900">I need help setting it up.</h3>
                <p className="mt-2 text-gray-600">Ensure all your devices are connected to the same Wi-Fi network. Open the app on your host machine (e.g., your PC or Mac), and then connect your other devices using the IP address shown on the host app.</p>
              </div>
            </div>
          </div>

          {/* AdSense Block 1 (In-Article) */}
          <div className="w-full bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm flex items-center justify-center min-h-[150px]">
             {/* Replace with actual AdSense ins tag later */}
             <div className="text-gray-400 text-sm">Advertisement</div>
             <ins className="adsbygoogle"
                  style={{ display: "block", textAlign: "center" }}
                  data-ad-layout="in-article"
                  data-ad-format="fluid"
                  data-ad-client="ca-pub-2851149974047726"
                  data-ad-slot="1234567890"></ins>
             <Script id="adsense-init-1" strategy="afterInteractive">
               {`(adsbygoogle = window.adsbygoogle || []).push({});`}
             </Script>
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
             <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Us</h2>
             <p className="text-gray-600 mb-6">If you have any other questions, feel free to reach out to our support team.</p>
             <form className="space-y-4">
                <div>
                   <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                   <input type="email" id="email" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border" placeholder="you@example.com" />
                </div>
                <div>
                   <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                   <textarea id="message" rows={4} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border" placeholder="How can we help?"></textarea>
                </div>
                <button type="button" className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
                   Send Message
                </button>
             </form>
          </div>
        </div>

        {/* Sidebar for Ads */}
        <aside className="lg:w-1/3 space-y-6 flex flex-col">
          {/* AdSense Block 2 (Sidebar Square/Vertical) */}
          <div className="w-full bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm flex-grow min-h-[300px] flex items-center justify-center">
             <div className="text-gray-400 text-sm">Advertisement</div>
             <ins className="adsbygoogle"
                  style={{ display: "block" }}
                  data-ad-client="ca-pub-2851149974047726"
                  data-ad-slot="0987654321"
                  data-ad-format="auto"
                  data-full-width-responsive="true"></ins>
             <Script id="adsense-init-2" strategy="afterInteractive">
               {`(adsbygoogle = window.adsbygoogle || []).push({});`}
             </Script>
          </div>
          
          {/* AdSense Block 3 (Sidebar Square/Vertical) */}
          <div className="w-full bg-white p-4 rounded-xl border border-gray-200 text-center shadow-sm flex-grow min-h-[300px] flex items-center justify-center">
             <div className="text-gray-400 text-sm">Advertisement</div>
             <ins className="adsbygoogle"
                  style={{ display: "block" }}
                  data-ad-client="ca-pub-2851149974047726"
                  data-ad-slot="1122334455"
                  data-ad-format="auto"
                  data-full-width-responsive="true"></ins>
             <Script id="adsense-init-3" strategy="afterInteractive">
               {`(adsbygoogle = window.adsbygoogle || []).push({});`}
             </Script>
          </div>
        </aside>
      </div>
    </main>
  );
}