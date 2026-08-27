"use client";

import Script from "next/script";
import { useEffect, useCallback, useState } from "react";
import { GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";

type GoogleCredentialResponse = {
  credential?: string;
  select_by?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            use_fedcm_for_prompt?: boolean;
            use_fedcm_for_button?: boolean;
            itp_support?: boolean;
            prompt_parent_id?: string;
          }) => void;
          prompt: (notification?: (notification: unknown) => void) => void;
          renderButton?: (parent: HTMLElement, options: unknown) => void;
          cancel?: () => void;
        };
      };
    };
    // Shared flag so AuthModal can re-trigger One Tap after closing
    __reinitOneTap?: () => void;
  }
}

export function GoogleOneTap() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.replace(/[\uFEFF\r\n\t ]/g, "").trim();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  async function handleCredentialResponse(response: GoogleCredentialResponse) {
    if (!response.credential) return;

    try {
      const auth = firebaseAuth();
      const credential = GoogleAuthProvider.credential(response.credential);
      const userCredential = await signInWithCredential(auth, credential);
      const idToken = await userCredential.user.getIdToken(true);

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (res.ok) {
        await signOut(auth);
        window.location.reload();
      }
    } catch (err) {
      console.error("Google One Tap sign-in error:", err);
    }
  }

  const initOneTap = useCallback(async () => {
    if (!clientId || typeof window === "undefined" || !window.google?.accounts?.id) {
      return;
    }

    // Check if user is already signed in — don't show One Tap if so
    try {
      const res = await fetch("/api/account", { cache: "no-store" });
      const data = await res.json();
      if (data?.signedIn) {
        return; // User is already logged in, skip One Tap
      }
    } catch {
      // If check fails, proceed with showing One Tap anyway
    }

    // Small delay so the page has time to settle and the user isn't immediately bombarded
    await new Promise((r) => setTimeout(r, 2000));

    // Re-check in case the user signed in during the delay
    if (typeof window === "undefined" || !window.google?.accounts?.id) return;

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        itp_support: true,
        prompt_parent_id: "google-one-tap-container",
      });

      window.google.accounts.id.prompt();
    } catch (err) {
      console.error("Google One Tap initialization error:", err);
    }
  }, [clientId]);

  // Expose re-init so AuthModal can restore One Tap after closing
  useEffect(() => {
    window.__reinitOneTap = initOneTap;
    return () => {
      delete window.__reinitOneTap;
    };
  }, [initOneTap]);

  useEffect(() => {
    if (scriptLoaded && clientId && window.google?.accounts?.id) {
      initOneTap();
    }
  }, [scriptLoaded, clientId, initOneTap]);

  return (
    <>
      <div 
        id="google-one-tap-container" 
        className="fixed bottom-6 right-6 z-[9999] pointer-events-auto" 
      />
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
    </>
  );
}
