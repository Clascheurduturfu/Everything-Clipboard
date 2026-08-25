"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Download, CreditCard, Loader2 } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";

type AccountState = {
  signedIn: boolean;
  purchased?: boolean;
  displayName?: string | null;
  email?: string | null;
};

type PurchaseButtonProps = {
  className?: string;
  buyLabel?: string;
  downloadLabel?: string;
  hideIfPurchased?: boolean;
  showIcon?: boolean;
};

export function PurchaseButton({
  className = "",
  buyLabel = "Buy for $3",
  downloadLabel = "Download Everything Clipboard",
  hideIfPurchased = false,
  showIcon = true,
}: PurchaseButtonProps) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/account", { cache: "no-store" })
      .then(async (response) => response.json() as Promise<AccountState>)
      .then(setAccount)
      .catch(() => setAccount({ signedIn: false }));
  }, []);

  async function handleBuy() {
    if (account?.signedIn && account.purchased) {
      window.location.assign("/account");
      return;
    }

    if (account?.signedIn) {
      setBusy(true);
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/checkout_sessions";
      document.body.appendChild(form);
      form.submit();
      return;
    }

    // If not signed in, open the intermediate Login / Register modal
    setAuthModalOpen(true);
  }

  // If already purchased and asked to hide:
  if (account?.signedIn && account.purchased && hideIfPurchased) {
    return null;
  }

  // If already purchased, transform into download button
  if (account?.signedIn && account.purchased) {
    return (
      <Link 
        href="/account" 
        className={className || "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-700 text-white text-base font-medium shadow-[0_10px_24px_rgba(59,130,246,0.26),inset_0_1px_0_rgba(255,255,255,0.35)] hover:from-blue-400 hover:to-blue-500 hover:-translate-y-0.5 active:scale-95 transition-all duration-300"}
      >
        {showIcon && <Download className="w-5 h-5" />}
        {downloadLabel}
      </Link>
    );
  }

  return (
    <>
      <div className="inline-flex flex-col items-center gap-1.5 w-full sm:w-auto">
        <button
          type="button"
          onClick={handleBuy}
          disabled={busy}
          className={className || "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-gradient-to-b from-blue-500 to-blue-600 border border-blue-700 text-white text-base font-medium shadow-[0_10px_24px_rgba(59,130,246,0.26),inset_0_1px_0_rgba(255,255,255,0.35)] hover:from-blue-400 hover:to-blue-500 hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-pointer"}
        >
          {busy ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Redirecting...</span>
            </>
          ) : (
            <>
              {showIcon && <CreditCard className="w-5 h-5" />}
              <span>{buyLabel}</span>
            </>
          )}
        </button>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        isBuying={true}
      />
    </>
  );
}
