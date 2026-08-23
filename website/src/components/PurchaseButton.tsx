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
  buyLabel = "Buy Everything Clipboard",
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

  async function signIn() {
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
      setAccount({ signedIn: true, purchased: false });
    } catch (signInError) {
      console.error("Google sign-in failed:", signInError);
      setError("Google sign-in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (account?.signedIn && account.purchased) {
    return <Link href="/account" className={className}>{downloadLabel}</Link>;
  }

  if (account?.signedIn) {
    return (
      <form action="/api/checkout_sessions" method="POST">
        <button type="submit" className={className}>{buyLabel}</button>
      </form>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <button type="button" onClick={signIn} disabled={busy} className={className}>
        {busy ? "Signing in..." : "Sign in with Google"}
      </button>
      {error && <span className="text-xs text-red-600 dark:text-red-400">{error}</span>}
    </div>
  );
}
