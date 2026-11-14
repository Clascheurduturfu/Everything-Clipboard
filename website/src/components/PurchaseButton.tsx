"use client";

import Link from "next/link";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";
import { useAccount } from "@/lib/account-client";

type PurchaseButtonProps = {
  buyLabel?: string;
  downloadLabel?: string;
  hideIfPurchased?: boolean;
  size?: "md" | "lg";
};

export function PurchaseButton({
  buyLabel = "Buy for $3",
  downloadLabel = "Download",
  hideIfPurchased = false,
  size = "lg",
}: PurchaseButtonProps) {
  const { account } = useAccount();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const className = `btn btn-primary ${size === "lg" ? "btn-lg" : ""} w-full sm:w-auto`;

  function handleBuy() {
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

    // Not signed in: sign in first, then continue to checkout.
    setAuthModalOpen(true);
  }

  if (account?.signedIn && account.purchased) {
    if (hideIfPurchased) return null;
    return (
      <Link href="/account" className={`${className} fade-in`}>
        <Download className="h-5 w-5" />
        {downloadLabel}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={handleBuy} disabled={busy} className={className}>
        {busy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Redirecting to checkout</span>
          </>
        ) : (
          <span>{buyLabel}</span>
        )}
      </button>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} isBuying={true} />
    </>
  );
}
