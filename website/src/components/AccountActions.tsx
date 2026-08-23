"use client";

import { signOut } from "firebase/auth";
import { useState } from "react";
import { firebaseAuth } from "@/lib/firebase-client";

export function AccountActions() {
  const [busy, setBusy] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await signOut(firebaseAuth());
      window.location.assign("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={handleSignOut} disabled={busy} className="text-sm font-medium text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors">
      {busy ? "Signing out..." : "Sign out"}
    </button>
  );
}
