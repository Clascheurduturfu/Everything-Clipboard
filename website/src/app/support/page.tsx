import { pageMetadata } from "@/lib/seo";
import { Mail } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata = pageMetadata({
  title: "Support",
  description: "Answers about your license, downloads, installing on iOS, encryption keys and setup for Everything Clipboard.",
  path: "/support",
});

const faqs = [
  {
    q: "How do I get my downloads on another device?",
    a: "Sign in with the same Google account on that device and open the Account page. Your license is tied to your Google account.",
  },
  {
    q: "Is $3 a one-time fee or a subscription?",
    a: "It is a single payment of $3. It covers the Windows, macOS, Android and iOS apps and all future updates. There are no recurring charges.",
  },
  {
    q: "Are my clipboard contents private?",
    a: "Text and images are encrypted on your device with AES-256-GCM, using a key you choose, before they are sent. The relay forwards encrypted data and cannot decrypt it.",
  },
  {
    q: "How do I install the iOS app?",
    a: "The iOS app is not on the App Store or TestFlight. You download the IPA from your Account page and install it by sideloading, using a tool such as AltStore or Sideloadly.",
  },
  {
    q: "Why is the app called ClipSync?",
    a: "Everything Clipboard is the name of this website and the product. The apps themselves are named ClipSync on your device.",
  },
];

export default function Support() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />

      <main className="relative z-10 flex-grow px-4 pb-16 pt-28 sm:px-6 lg:pt-36">
        <div className="mx-auto max-w-3xl space-y-8">
          <header className="text-center">
            <h1 className="text-4xl font-medium tracking-tight text-slate-950 sm:text-5xl dark:text-white">Support</h1>
            <p className="mt-4 text-base text-slate-600 sm:text-lg dark:text-slate-400">
              Your license, downloads, encryption keys and setup.
            </p>
          </header>

          <section className="card p-6 sm:p-8" aria-labelledby="faq">
            <h2 id="faq" className="text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
              Frequently asked questions
            </h2>
            <dl className="mt-6 space-y-6">
              {faqs.map(({ q, a }) => (
                <div key={q}>
                  <dt className="text-base font-medium text-slate-950 dark:text-white">{q}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{a}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8" aria-labelledby="contact">
            <div className="flex items-start gap-4">
              <div className="icon-tile">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 id="contact" className="text-lg font-medium text-slate-950 dark:text-white">
                  Email support
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Write to support@everything-clipboard.online. Include the email address of your account and, for payment questions, your receipt.
                </p>
              </div>
            </div>
            <a href="mailto:support@everything-clipboard.online" className="btn btn-primary shrink-0">
              Email us
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
