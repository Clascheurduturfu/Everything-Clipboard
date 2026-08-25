import Image from "next/image";
import Link from "next/link";
import { Shield, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative z-10 border-t border-slate-200/50 dark:border-slate-800/50 py-12 mt-auto glass-nav rounded-t-[2.5rem]">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <Link href="/" className="flex items-center space-x-2.5 opacity-90 hover:opacity-100 transition-opacity">
          <Image src="/logo.png" alt="Everything Clipboard Logo" width={28} height={28} className="rounded-lg shadow-sm" />
          <span className="text-slate-900 dark:text-white font-bold tracking-tight text-sm">
            Everything Clipboard
          </span>
        </Link>

        <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500 dark:text-slate-400 font-light">
          <Link href="/features" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Features
          </Link>
          <Link href="/support" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Support & FAQ
          </Link>
          <Link href="/account" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Account / Downloads
          </Link>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-blue-500" />
            End-to-End Encrypted
          </span>
          <span>•</span>
          <span>&copy; {new Date().getFullYear()} Everything Clipboard</span>
        </div>
      </div>
    </footer>
  );
}
