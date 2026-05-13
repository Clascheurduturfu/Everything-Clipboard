"use client";

import Link from "next/link";
import { Download } from "lucide-react";
import { useEffect } from "react";

const checkoutSessionStorageKey = "clipsync_checkout_session_id";

export function DownloadAccessLink() {
  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    const sessionId = window.localStorage.getItem(checkoutSessionStorageKey);

    if (sessionId) {
      event.preventDefault();
      window.location.href = `/success?session_id=${encodeURIComponent(sessionId)}`;
    }
  }

  return (
    <Link href="/success" onClick={handleClick} className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
      <Download className="h-4 w-4" />
      Download
    </Link>
  );
}

export function StoreCheckoutSession({ sessionId }: { sessionId: string }) {
  useEffect(() => {
    window.localStorage.setItem(checkoutSessionStorageKey, sessionId);
  }, [sessionId]);

  return null;
}
