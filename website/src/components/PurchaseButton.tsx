"use client";

import Link from "next/link";
import { inMemoryPersistence, setPersistence, signInWithPopup, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";

type AccountState = {
  signedIn: boolean;
  purchased?: boolean;
};

type PurchaseButtonProps = {
  className?: string;
  buyLabel?: string;
  downloadLabel?: string;
};

export function PurchaseButton({
  className = "",
  buyLabel = "Buy for $3",
  downloadLabel = "Download",
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

      if (!response.ok) throw new Error("Unable to create your secure session");
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
      setError("Google sign-in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (account?.signedIn && account.purchased) {
    return (
      <Link href="/account" className={className}>
        {downloadLabel}
      </Link>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={handleBuy}
        disabled={busy}
        className={className}
      >
        {busy ? "Connecting..." : buyLabel}
      </button>
      {error && <span className="text-xs text-red-500 max-w-xs text-center">{error}</span>}
    </div>
  );
}
