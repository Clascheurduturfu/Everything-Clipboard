"use client";

import Script from "next/script";
import { useEffect, useCallback, useRef, useState } from "react";
import { GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { acquire, getGis, holdsLease, initializeFor, onRelease, release } from "@/lib/gis";

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

const ONE_TAP_OWNER = "google-one-tap";
const SETTLE_DELAY_MS = 2000;

export function GoogleOneTap() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.replace(/[\uFEFF\r\n\t ]/g, "").trim();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Tracks the in-flight attempt so a second call (or unmount) can abandon it.
  const attemptRef = useRef(0);

  const handleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
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
  }, []);

  const initOneTap = useCallback(async () => {
    if (!clientId || typeof window === "undefined" || !getGis()) {
      return;
    }

    const attempt = ++attemptRef.current;
    const abandoned = () => attempt !== attemptRef.current;

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
    if (abandoned()) return;

    // Small delay so the page has time to settle and the user isn't immediately bombarded
    await new Promise((r) => setTimeout(r, SETTLE_DELAY_MS));

    // Re-check in case the user signed in, navigated, or opened the sign-in
    // dialog during the delay. Previously this resumed unconditionally and
    // re-initialized the GIS singleton, silently rebinding any button the
    // AuthModal had just rendered — which is why the sign-in button so often
    // did nothing.
    if (abandoned() || typeof window === "undefined" || !getGis()) return;

    // Passive One Tap is the lowest priority holder: refused while a dialog is
    // open. We re-arm from the onRelease subscription below instead.
    if (!acquire(ONE_TAP_OWNER, "onetap")) return;

    const initialised = initializeFor(ONE_TAP_OWNER, {
      client_id: clientId,
      callback: handleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true,
      use_fedcm_for_prompt: false, // Forces iframe mode so it respects prompt_parent_id (bottom-right)
      itp_support: true,
      prompt_parent_id: "google-one-tap-container",
    });

    if (!initialised) return;

    try {
      getGis()?.prompt();
    } catch (err) {
      console.error("Google One Tap initialization error:", err);
    }
  }, [clientId, handleCredentialResponse]);

  // Expose re-init so AuthModal can restore One Tap after closing
  useEffect(() => {
    window.__reinitOneTap = initOneTap;
    return () => {
      delete window.__reinitOneTap;
    };
  }, [initOneTap]);

  // Re-arm automatically whenever a dialog hands the GIS lease back.
  useEffect(() => onRelease(() => void initOneTap()), [initOneTap]);

  useEffect(() => {
    if (scriptLoaded && clientId && getGis()) {
      void initOneTap();
    }
  }, [scriptLoaded, clientId, initOneTap]);

  // Abandon any in-flight attempt and drop the lease on unmount.
  useEffect(() => {
    const attempts = attemptRef;
    return () => {
      attempts.current++;
      if (holdsLease(ONE_TAP_OWNER)) release(ONE_TAP_OWNER);
    };
  }, []);

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
