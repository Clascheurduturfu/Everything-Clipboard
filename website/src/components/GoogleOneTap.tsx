"use client";

import Script from "next/script";
import { useEffect } from "react";
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
            itp_support?: boolean;
          }) => void;
          prompt: (notification?: (notification: unknown) => void) => void;
          renderButton?: (parent: HTMLElement, options: unknown) => void;
        };
      };
    };
  }
}

export function GoogleOneTap() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

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

  function initOneTap() {
    if (!clientId || typeof window === "undefined" || !window.google?.accounts?.id) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        itp_support: true,
      });

      window.google.accounts.id.prompt();
    } catch (err) {
      console.error("Google One Tap initialization error:", err);
    }
  }

  useEffect(() => {
    if (clientId && window.google?.accounts?.id) {
      initOneTap();
    }
  }, [clientId]);

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
      onLoad={initOneTap}
    />
  );
}
