import Link from "next/link";
import { CheckCircle, Download, Monitor, Smartphone, Apple } from "lucide-react";

export default function Success({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // In a real application, you would verify the session_id with Stripe here securely via a Server Component 
  // or API route before showing the download links to prevent unauthorized access.
  const sessionId = searchParams.session_id;

  return (
    <main className="flex-grow flex flex-col bg-gray-50 min-h-screen items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8 bg-white p-10 rounded-3xl shadow-xl border border-gray-100 text-center">
        
        <div className="flex justify-center">
          <CheckCircle className="h-24 w-24 text-green-500 animate-[bounce_1s_ease-in-out]" />
        </div>
        
        <div>
          <h2 className="mt-6 text-4xl font-extrabold text-gray-900">Payment Successful!</h2>
          <p className="mt-4 text-lg text-gray-500">
            Thank you for purchasing ClipSync. You now have full access to share your clipboard across all your devices. 
            An email receipt has been sent to you.
          </p>
          {sessionId && (
             <p className="mt-2 text-sm text-gray-400">Order Reference: {sessionId}</p>
          )}
        </div>

        <div className="mt-10 border-t border-gray-200 pt-10">
          <h3 className="text-2xl font-bold text-gray-900 mb-8">Download Your Apps</h3>
          
          <div className="grid gap-6 sm:grid-cols-3">
            
            {/* Windows Download */}
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md transition-shadow">
              <Monitor className="h-10 w-10 text-blue-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Windows</h4>
              <p className="text-sm text-gray-500 mb-6 text-center">Windows 10/11 (64-bit)</p>
              {/* Note: Connect this to actual secure download API route */}
              <a href="/api/download?os=windows" className="mt-auto w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                <Download className="mr-2 h-4 w-4" /> Download
              </a>
            </div>

            {/* MacOS Download */}
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md transition-shadow">
              <Apple className="h-10 w-10 text-gray-800 mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">MacOS</h4>
              <p className="text-sm text-gray-500 mb-6 text-center">macOS 12+ (Apple Silicon/Intel)</p>
              <a href="/api/download?os=macos" className="mt-auto w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800">
                <Download className="mr-2 h-4 w-4" /> Download
              </a>
            </div>

            {/* Android Download */}
            <div className="flex flex-col items-center p-6 bg-gray-50 rounded-2xl border border-gray-200 hover:shadow-md transition-shadow">
              <Smartphone className="h-10 w-10 text-green-600 mb-4" />
              <h4 className="text-lg font-semibold text-gray-900 mb-2">Android</h4>
              <p className="text-sm text-gray-500 mb-6 text-center">Android 8.0+ (.apk)</p>
              <a href="/api/download?os=android" className="mt-auto w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
                <Download className="mr-2 h-4 w-4" /> Download
              </a>
            </div>

          </div>
        </div>
        
        <div className="pt-8">
           <Link href="/" className="text-blue-600 hover:text-blue-500 font-medium">
             &larr; Return to Home
           </Link>
        </div>
      </div>
    </main>
  );
}