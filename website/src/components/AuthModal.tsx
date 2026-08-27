"use client";

import { useState, useEffect, useRef } from "react";
import { GoogleAuthProvider, signInWithCredential, signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
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
  const googleButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    let checkInterval: NodeJS.Timeout;

    const tryRender = () => {
      if (window.google?.accounts?.id && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "",
          callback: async (response) => {
            setBusy(true);
            setError(null);
            try {
              const auth = firebaseAuth();
              const credential = GoogleAuthProvider.credential(response.credential!);
              const userCredential = await signInWithCredential(auth, credential);
              const idToken = await userCredential.user.getIdToken(true);

              const res = await fetch("/api/auth/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idToken }),
              });

              if (!res.ok) throw new Error("Unable to create session");
              await signOut(auth);

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
            } catch (err) {
              console.error("Sign in failed:", err);
              setError("Sign-in could not be completed. Please try again.");
              setBusy(false);
            }
          },
        });

        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: isBuying ? "continue_with" : "signin_with",
          width: "300",
        });
        return true;
      }
      return false;
    };

    if (!tryRender()) {
      checkInterval = setInterval(() => {
        if (tryRender()) clearInterval(checkInterval);
      }, 500);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [isOpen, isBuying, onClose, onSuccess]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="fixed inset-0" onClick={onClose} />
      
      <div className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 z-10 animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
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

        {/* Google Sign-In Button */}
        <div className="flex flex-col items-center justify-center space-y-3 min-h-[50px]">
          {busy && (
            <div className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium text-sm shadow-sm opacity-50">
              <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              <span>Connecting to Google...</span>
            </div>
          )}
          
          <div 
            ref={googleButtonRef} 
            className={`w-full flex justify-center [&>div]:w-full [&>div]:flex [&>div]:justify-center ${busy ? 'hidden' : ''}`}
          />

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
