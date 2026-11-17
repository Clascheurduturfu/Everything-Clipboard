"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";

/**
 * Web account deletion (required by Google Play for apps that create
 * accounts). DELETE /api/account removes the profile, app sessions, Google
 * Play purchase records and the Firebase user, then clears the web session.
 */
export function DeleteAccountButton() {
  const [state, setState] = useState<"idle" | "deleting" | "error">("idle");

  async function deleteAccount() {
    const ok = window.confirm(
      "Delete your Everything Clipboard account?\n\n" +
        "This removes your profile and purchase records and signs you out on every device. " +
        "Your lifetime unlock can't be restored afterwards. This cannot be undone.",
    );
    if (!ok) return;
    setState("deleting");
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      if (!response.ok) throw new Error(String(response.status));
      window.location.assign("/?account=deleted");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={deleteAccount}
        disabled={state === "deleting"}
        className="btn btn-secondary btn-sm inline-flex items-center gap-1.5 text-red-700 dark:text-red-400"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {state === "deleting" ? "Deleting…" : "Delete account"}
      </button>
      {state === "error" && (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          Could not delete the account. Check your connection and try again, or email support@everything-clipboard.online.
        </p>
      )}
    </div>
  );
}
