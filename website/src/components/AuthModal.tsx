"use client";

import { useState, useCallback, useEffect, useId, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "@/lib/account-client";
import { acquire, cancelPrompt, getGis, holdsLease, initializeFor, onGisReady, release } from "@/lib/gis";
import { X, Shield, Loader2 } from "lucide-react";
import { ModalShell } from "@/components/overlay";

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
  const router = useRouter();
  const { refresh } = useAccount();
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.replace(/[\uFEFF\r\n\t ]/g, "").trim();

  // Every mounted AuthModal needs its own identity: the homepage renders three
  // of them (Navbar + two PurchaseButtons) and only the open one may drive GIS.
  const ownerId = useId();

  const handleAuthSuccess = useCallback(async () => {
    if (onSuccess) {
      onClose();
      onSuccess();
    } else if (isBuying) {
      // Full navigation to Stripe, so there is nothing to reset afterwards.
      onClose();
      const form = document.createElement("form");
      form.method = "POST";
      form.action = "/api/checkout_sessions";
      document.body.appendChild(form);
      form.submit();
    } else {
      // No page reload: pick up the new account state, re-render server
      // components with the new cookie, then close the dialog.
      await refresh();
      router.refresh();
      onClose();
      setBusy(false);
    }
  }, [isBuying, onClose, onSuccess, refresh, router]);

  // Parents pass inline arrows (`onClose={() => setOpen(false)}`), so
  // handleAuthSuccess gets a new identity on every parent render. Keeping it in
  // a ref keeps the effect below off that treadmill - otherwise the effect
  // re-ran constantly and renderButton wiped and redrew the Google button,
  // sometimes out from under the user's click.
  const authSuccessRef = useRef(handleAuthSuccess);
  useEffect(() => {
    authSuccessRef.current = handleAuthSuccess;
  }, [handleAuthSuccess]);

  const isBuyingRef = useRef(isBuying);
  useEffect(() => {
    isBuyingRef.current = isBuying;
  }, [isBuying]);

  // Warm the Firebase chunk while the dialog is open so the click that follows
  // a Google credential does not also wait for a download.
  useEffect(() => {
    if (isOpen) void import("@/lib/auth-flow");
  }, [isOpen]);

  // When the modal opens, take the GIS lease and render the invisible GIS
  // button overlay for FedCM Button Mode. When it closes, hand the lease back
  // so passive One Tap can re-arm.
  useEffect(() => {
    if (!isOpen || !clientId) {
      return;
    }

    let cancelled = false;

    const setup = () => {
      if (cancelled) return;
      const gis = getGis();
      if (!gis) return;

      // An open dialog outranks One Tap, so this is only refused if another
      // modal is already driving GIS - in which case we stay on the popup
      // fallback rather than fighting over the singleton.
      if (!acquire(ownerId, "modal")) return;

      // Dismiss any One Tap prompt before switching GIS into button mode.
      cancelPrompt();

      const initialised = initializeFor(ownerId, {
        client_id: clientId,
        callback: async (response) => {
          if (!response.credential) return;
          setBusy(true);
          try {
            const { exchangeGoogleCredential } = await import("@/lib/auth-flow");
            await exchangeGoogleCredential(response.credential);
            await authSuccessRef.current();
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
      } as Parameters<typeof gis.initialize>[0]);

      if (!initialised) return;

      try {
        if (googleBtnRef.current && gis.renderButton) {
          // GIS caps width at 400px, but the dialog is narrower than that on
          // phones. Asking for more than the container gives us a button whose
          // real hit area is clipped by `overflow-hidden`.
          const available = googleBtnRef.current.offsetWidth || 400;
          const width = Math.max(200, Math.min(400, Math.round(available)));

          googleBtnRef.current.innerHTML = "";
          gis.renderButton(googleBtnRef.current, {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "pill",
            text: isBuyingRef.current ? "continue_with" : "signin_with",
            width,
          });
          if (!cancelled) setGisReady(true);
        }
      } catch (err) {
        console.error("GIS renderButton error:", err);
        if (!cancelled) setGisReady(false);
      }
    };

    // Retry once the script lands, so opening the modal before GIS has loaded
    // no longer strands the user on the popup fallback for good.
    const unsubscribe = onGisReady(setup);

    return () => {
      cancelled = true;
      unsubscribe();
      setGisReady(false);
      if (holdsLease(ownerId)) {
        release(ownerId);
        // Restore passive One Tap now that the dialog is gone.
        window.__reinitOneTap?.();
      }
    };
  }, [isOpen, clientId, ownerId]);


  // Fallback: standard Firebase signInWithPopup for browsers without GIS/FedCM
  async function handlePopupFallback() {
    setBusy(true);
    setError(null);

    try {
      const { exchangeGooglePopup } = await import("@/lib/auth-flow");
      await exchangeGooglePopup();
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

  return (
    <ModalShell open={isOpen} onClose={onClose} label={isBuying ? "Sign in to buy" : "Sign in"}>
      <button
        type="button"
        onClick={onClose}
        className="focus-ring absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="mb-6 text-center">
        <div className="icon-tile mx-auto mb-4 h-12 w-12">
          <Shield className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-medium text-slate-950 dark:text-white">
          {isBuying ? "Sign in to buy" : "Sign in"}
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {isBuying
            ? "Your license is tied to your Google account, so you can download the apps on any device."
            : "Sign in with Google to reach your downloads and setup."}
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
          <p role="alert" className="text-center text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {isBuying && (
        <p className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          One payment of $3. Lifetime access on every platform.
        </p>
      )}
    </ModalShell>
  );
}
