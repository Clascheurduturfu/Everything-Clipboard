import Image from "next/image";
import Link from "next/link";
import { SITE_VERSION } from "@/lib/version";

const linkClass =
  "text-slate-600 transition-colors hover:text-slate-950 dark:text-slate-400 dark:hover:text-white";

export function Footer() {
  return (
    <footer className="relative z-10 mt-auto border-t border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 px-6 py-8 md:flex-row">
        <Link href="/" className="focus-ring flex items-center gap-2.5 rounded-lg">
          <Image src="/logo-56.png" alt="" width={28} height={28} unoptimized className="rounded-lg" />
          <span className="text-sm font-medium text-slate-900 dark:text-white">Everything Clipboard</span>
        </Link>

        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
          <Link href="/features" className={linkClass}>Features</Link>
          <Link href="/support" className={linkClass}>Support</Link>
          <Link href="/account" className={linkClass}>Account</Link>
          <a href="/clipsync-privacy.html" className={linkClass}>Privacy</a>
        </nav>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          &copy; {new Date().getFullYear()} Everything Clipboard <span aria-hidden="true">&middot;</span>{" "}
          <span className="tabular-nums">v{SITE_VERSION}</span>
        </p>
      </div>
    </footer>
  );
}
