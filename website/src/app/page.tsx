import { Check, Monitor, Lock, Image as ImageIcon } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PurchaseButton } from "@/components/PurchaseButton";
import { HeroShowcase } from "@/components/HeroShowcase";

const highlights = [
  {
    Icon: Monitor,
    title: "Four platforms",
    body: "Windows, macOS, Android and iOS. Copy on one device and it shows up on the others a moment later. iOS is sideload-only: there is no App Store or TestFlight build, so you install the IPA with a tool such as AltStore or Sideloadly.",
  },
  {
    Icon: Lock,
    title: "Encrypted with your key",
    body: "Everything is encrypted with AES-256-GCM, using a key you choose, before it leaves your device. The relay only passes along data it cannot read.",
  },
  {
    Icon: ImageIcon,
    title: "Text and images",
    body: "Plain text and images up to 16 MB sync between your devices. Large images are split into encrypted chunks.",
  },
];

export default function Home() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />

      <main className="relative z-10 flex-grow">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-10 pt-28 sm:px-6 lg:grid-cols-2 lg:gap-14 lg:pb-14 lg:pt-36">
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-medium leading-[1.1] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
              One clipboard.
              <span className="block text-blue-600 dark:text-blue-400">All your devices.</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg lg:mx-0 dark:text-slate-400">
              Copy on your Mac, paste on your Windows PC. Copy on your Android phone, paste on your iPhone. Text and
              images up to 16 MB, encrypted with a key you choose. Use the hosted relay or run your own server.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <PurchaseButton buyLabel="Buy for $3" downloadLabel="Download" />
            </div>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-600 lg:justify-start dark:text-slate-400">
              {["One-time $3 payment, no subscription", "Works on your local network", "Lifetime updates"].map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <HeroShowcase />
        </section>

        <section className="px-4 py-10 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-6xl">
            <h2 className="mx-auto max-w-2xl text-center text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              What it does
            </h2>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {highlights.map(({ Icon, title, body }) => (
                <div key={title} className="card flex flex-col gap-4 p-6">
                  <div className="icon-tile">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-slate-950 dark:text-white">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 pb-16 pt-4 sm:px-6 sm:pb-20">
          <div className="card mx-auto max-w-3xl p-8 text-center sm:p-12">
            <h2 className="text-3xl font-medium tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              Get Everything Clipboard for $3
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-base text-slate-600 dark:text-slate-400">
              One payment, no subscription. It covers the Windows, macOS, Android and iOS apps and every future update.
            </p>
            <div className="mt-7 flex justify-center">
              <PurchaseButton buyLabel="Buy for $3" downloadLabel="Download" />
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
