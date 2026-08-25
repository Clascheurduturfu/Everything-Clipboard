"use client";

import Link from "next/link";
import { inMemoryPersistence, setPersistence, signInWithPopup, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";
import { Download, Sparkles, Loader2, ArrowRight } from "lucide-react";

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
  downloadLabel = "Download Apps",
  hideIfPurchased = false,
  showIcon = true,
}: PurchaseButtonProps) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/checkout_sessions";
      document.body.appendChild(form);
      form.submit();
      return;
    }

    // If not signed in, sign in first then proceed to checkout
    setBusy(true);
    setError(null);
    try {
      const auth = firebaseAuth();
      await setPersistence(auth, inMemoryPersistence);
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken(true);
      
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Unable to create your secure session");
      }
      await signOut(auth);
      
      const updated = await fetch("/api/account", { cache: "no-store" }).then((r) => r.json());
      setAccount(updated);

      if (updated?.purchased) {
        window.location.assign("/account");
      } else {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "/api/checkout_sessions";
        document.body.appendChild(form);
        form.submit();
      }
    } catch (signInError: unknown) {
      console.error("Sign-in failed:", signInError);
      const err = signInError as { code?: string; message?: string };
      if (err?.code === "auth/popup-closed-by-user") {
        return;
      }
      setError(err?.message || "Google sign-in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
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
        className={className || "inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white text-base font-semibold shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5 transition-all duration-300"}
      >
        {showIcon && <Download className="w-5 h-5" />}
        {downloadLabel}
      </Link>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-1.5 w-full sm:w-auto">
      <button
        type="button"
        onClick={handleBuy}
        disabled={busy}
        className={className || "w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-base font-semibold shadow-[0_10px_24px_rgba(59,130,246,0.26),inset_0_1px_0_rgba(255,255,255,0.35)] hover:-translate-y-0.5 active:scale-95 transition-all duration-300 cursor-pointer"}
      >
        {busy ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            {showIcon && <Sparkles className="w-5 h-5 text-blue-200" />}
            <span>{buyLabel}</span>
            <ArrowRight className="w-4 h-4 opacity-70" />
          </>
        )}
      </button>
      {error && <span className="text-xs text-red-500 max-w-xs text-center">{error}</span>}
    </div>
  );
}
