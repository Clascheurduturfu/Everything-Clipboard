import Link from "next/link";
import { Download } from "lucide-react";

export function DownloadAccessLink() {
  return (
    <Link href="/account" className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
      <Download className="h-4 w-4" />
      Account
    </Link>
  );
}
