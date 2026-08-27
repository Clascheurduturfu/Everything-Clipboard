"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, inMemoryPersistence, setPersistence, signOut } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";
import { X, Shield, Sparkles, Loader2 } from "lucide-react";

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  isBuying?: boolean;
};

export function AuthModal({ isOpen, onClose, onSuccess, isBuying = false }: AuthModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gisReady, setGisReady] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.replace(/[\uFEFF\r\n\t ]/g, "").trim();

  const handleAuthSuccess = useCallback(async () => {
    onClose();
    if (onSuccess) {
      onSuccess();
    } else if (isBuying) {
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/checkout_sessions";
      document.body.appendChild(form);
      form.submit();
    } else {
      window.location.reload();
    }
  }, [isBuying, onClose, onSuccess]);

  // When the modal opens, render the invisible GIS button overlay for FedCM Button Mode.
  // When it closes, restore GIS to passive One Tap mode via __reinitOneTap.
  useEffect(() => {
    if (!isOpen) {
      // Modal just closed — restore GIS to passive One Tap mode
      if (gisReady) {
        setGisReady(false);
        // Small delay to let React unmount, then re-init One Tap
        setTimeout(() => {
          window.__reinitOneTap?.();
        }, 300);
      }
      return;
    }

    if (!clientId || typeof window === "undefined" || !window.google?.accounts?.id) {
      setGisReady(false);
      return;
    }

    // Cancel any active One Tap prompt before we re-initialize for button mode
    try { window.google.accounts.id.cancel?.(); } catch { /* ignore */ }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (!response.credential) return;
          setBusy(true);
          try {
            const auth = firebaseAuth();
            const cred = GoogleAuthProvider.credential(response.credential);
            const userCred = await signInWithCredential(auth, cred);
            const idToken = await userCred.user.getIdToken(true);

            const res = await fetch("/api/auth/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ idToken }),
            });

            if (!res.ok) throw new Error("Unable to create session");
            await signOut(auth);
            await handleAuthSuccess();
          } catch (err) {
            console.error("FedCM Button Mode sign-in error:", err);
            setError("Sign-in could not be completed. Please try again.");
            setBusy(false);
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        use_fedcm_for_prompt: true,
        use_fedcm_for_button: true,
      } as Parameters<typeof window.google.accounts.id.initialize>[0]);

      // Render the invisible Google button into the always-mounted ref
      if (googleBtnRef.current && window.google.accounts.id.renderButton) {
        googleBtnRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: isBuying ? "continue_with" : "signin_with",
          width: 400,
        });
        setGisReady(true);
      }
    } catch (err) {
      console.error("GIS renderButton error:", err);
      setGisReady(false);
    }
  }, [isOpen, clientId, isBuying, handleAuthSuccess]);

  // Fallback: standard Firebase signInWithPopup for browsers without GIS/FedCM
  async function handlePopupFallback() {
    setBusy(true);
    setError(null);

    try {
      const auth = firebaseAuth();
      await setPersistence(auth, inMemoryPersistence);
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken(true);

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        throw new Error("Unable to create session");
      }
      await signOut(auth);
      await handleAuthSuccess();
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === "auth/popup-closed-by-user") {
        setBusy(false);
        return;
      }
      console.error("Sign in failed:", err);
      setError("Sign-in could not be completed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/60 mx-auto flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4 shadow-sm">
            {isBuying ? <Sparkles className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
          </div>
          <h3 className="text-2xl font-bold text-slate-950 dark:text-white">
            {isBuying ? "Login / Register to Buy" : "Login / Register"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 font-light">
            {isBuying 
              ? "Sign in with Google to link your lifetime license and download apps on any device." 
              : "Sign in or create an account with Google to access your downloads and settings."}
          </p>
        </div>

        {/* FedCM Button Mode via invisible GIS overlay on custom button */}
        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="relative w-full">
            {/* Our visible custom styled button */}
            <button
              type="button"
              onClick={gisReady ? undefined : handlePopupFallback}
              disabled={busy}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-white dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-medium text-sm transition-all shadow-sm cursor-pointer disabled:opacity-70"
            >
              {busy ? (
                <div className="flex items-center justify-center gap-2.5">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 shrink-0" />
                  <span>Connecting to Google...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isBuying ? "Continue with Google" : "Sign in with Google"}</span>
                </div>
              )}
            </button>

            {/* Invisible GIS-rendered Google button overlay — always mounted so ref stays stable.
                When GIS is ready and not busy, it sits on top (z-10) and captures clicks → triggers FedCM.
                Otherwise it's beneath (z-[-1]) and our custom button handles clicks → popup fallback. */}
            <div
              ref={googleBtnRef}
              className="absolute inset-0 flex items-center justify-center overflow-hidden rounded-full cursor-pointer"
              style={{ 
                opacity: 0.01,
                zIndex: gisReady && !busy ? 10 : -1,
                pointerEvents: gisReady && !busy ? "auto" : "none",
              }}
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 text-center font-medium">{error}</p>
          )}
        </div>

        {/* Feature summary */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 text-center flex items-center justify-center gap-4">
          <span>✓ One-time $3 payment</span>
          <span>✓ Lifetime access</span>
          <span>✓ All platforms</span>
        </div>
      </div>
    </div>
  );
}
