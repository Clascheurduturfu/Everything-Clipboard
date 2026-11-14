import type { Metadata } from "next";
import { Lock, Monitor, Network, Image as ImageIcon, Smartphone, Apple } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PurchaseButton } from "@/components/PurchaseButton";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Text and image clipboard sync for Windows, macOS, Android and iOS, encrypted with AES-256-GCM using a key you choose. Use the hosted relay, your own server or your local network.",
  alternates: { canonical: "/features" },
};

const hosting = [
  {
    title: "Hosted relay",
    body: "The apps connect to our relay by default, so there is nothing to set up. It only forwards encrypted data and cannot read your clipboard.",
  },
  {
    title: "Self-hosted",
    body: "Run the relay on your own server. You control it, and nothing depends on ours.",
  },
  {
    title: "Local network",
    body: "Sync directly over your own Wi-Fi, so the traffic stays on your network.",
  },
];

const platforms = [
  { Icon: Monitor, label: "Windows 10 / 11 (64-bit)" },
  { Icon: Apple, label: "macOS 12 or later (Apple Silicon and Intel)" },
  { Icon: Smartphone, label: "Android 8.0 or later" },
  { Icon: Apple, label: "iOS 15.0 or later, sideload only (AltStore or Sideloadly)" },
];

export default function Features() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />

      <main className="relative z-10 flex-grow px-4 pb-16 pt-28 sm:px-6 lg:pt-36">
        <div className="mx-auto max-w-5xl space-y-8">
          <header className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-medium tracking-tight text-slate-950 sm:text-5xl dark:text-white">Features</h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
              Everything Clipboard syncs text and images between your devices. It is encrypted with a key you choose,
              and you decide where the relay runs.
            </p>
          </header>

          <section className="card p-6 sm:p-8" aria-labelledby="hosting">
            <h2 id="hosting" className="flex items-center gap-3 text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
              <span className="icon-tile">
                <Network className="h-5 w-5" />
              </span>
              Where it runs
            </h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {hosting.map(({ title, body }) => (
                <div key={title}>
                  <h3 className="text-base font-medium text-slate-900 dark:text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section className="card p-6 sm:p-8" aria-labelledby="encryption">
              <h2 id="encryption" className="flex items-center gap-3 text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
                <span className="icon-tile">
                  <Lock className="h-5 w-5" />
                </span>
                Encryption
              </h2>
              <p className="mt-5 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
                Text and images are encrypted on your device with AES-256-GCM before they are sent. You choose the key
                and set the same one in each app. Without it, what the relay carries is unreadable.
              </p>
            </section>

            <section className="card p-6 sm:p-8" aria-labelledby="platforms">
              <h2 id="platforms" className="flex items-center gap-3 text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
                <span className="icon-tile">
                  <Monitor className="h-5 w-5" />
                </span>
                Platforms
              </h2>
              <ul className="mt-5 space-y-3">
                {platforms.map(({ Icon, label }) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-slate-800 dark:text-slate-200">
                    <Icon className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                    {label}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="card p-6 sm:p-8" aria-labelledby="images">
            <h2 id="images" className="flex items-center gap-3 text-2xl font-medium tracking-tight text-slate-950 dark:text-white">
              <span className="icon-tile">
                <ImageIcon className="h-5 w-5" />
              </span>
              Image sync
            </h2>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
              Copy a screenshot or photo on one device and paste it on another. Images up to 16 MB are sent in chunks
              with the same AES-256-GCM encryption as text.
            </p>
            <div className="mt-6">
              <PurchaseButton buyLabel="Buy for $3" downloadLabel="Download" size="md" />
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
