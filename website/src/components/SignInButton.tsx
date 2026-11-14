"use client";

import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";

type SignInButtonProps = {
  className?: string;
  children?: React.ReactNode;
};

/**
 * Plain "sign in" trigger: opens the auth dialog without the buying flow, so a
 * successful sign-in stays on the current page (and just re-renders it)
 * instead of sending an unlicensed user to Stripe.
 */
export function SignInButton({ className = "", children = "Sign in with Google" }: SignInButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <AuthModal isOpen={open} onClose={() => setOpen(false)} isBuying={false} />
    </>
  );
}
