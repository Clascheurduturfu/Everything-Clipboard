"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signInWithPopup, signOut, inMemoryPersistence, setPersistence } from "firebase/auth";
import { firebaseAuth, googleProvider } from "@/lib/firebase-client";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Sparkles, 
  Download, 
  ShieldCheck, 
  ArrowRight,
  Loader2,
  ExternalLink
} from "lucide-react";

export type AccountInfo = {
  signedIn: boolean;
  displayName?: string | null;
  email?: string | null;
  purchased?: boolean;
  latestOrderId?: string | null;
};

export function Navbar() {
  const pathname = usePathname();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  useEffect(() => {
    fetchAccount();
  }, [pathname]);

  async function fetchAccount() {
    try {
      const res = await fetch("/api/account", { cache: "no-store" });
      const data = await res.json();
      setAccount(data);
    } catch {
      setAccount({ signedIn: false });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    setAuthBusy(true);
    try {
      const auth = firebaseAuth();
      await setPersistence(auth, inMemoryPersistence);
      const credential = await signInWithPopup(auth, googleProvider);
      const idToken = await credential.user.getIdToken(true);

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        throw new Error("Unable to create session");
      }
      await signOut(auth);
      await fetchAccount();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code !== "auth/popup-closed-by-user") {
        console.error("Sign-in error:", err);
      }
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    setAuthBusy(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      await signOut(firebaseAuth());
      setAccount({ signedIn: false });
      setUserDropdownOpen(false);
      setMobileMenuOpen(false);
      if (pathname.startsWith("/account")) {
        window.location.assign("/");
      }
    } catch (err) {
      console.error("Sign-out error:", err);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleCheckout() {
    if (!account?.signedIn) {
      await handleSignIn();
      return;
    }
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/api/checkout_sessions";
    document.body.appendChild(form);
    form.submit();
  }

  function toggleUserDropdown() {
    setUserDropdownOpen((prev) => !prev);
    setMobileMenuOpen(false);
  }

  function toggleMobileMenu() {
    setMobileMenuOpen((prev) => !prev);
    setUserDropdownOpen(false);
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-3 px-3 sm:px-6">
      <nav className="max-w-7xl mx-auto">
        <div className="glass-nav rounded-full px-3.5 sm:px-6 py-2 sm:py-2.5 flex justify-between items-center transition-all duration-300">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 group shrink-0">
            <Image 
              src="/logo.png" 
              alt="Everything Clipboard Logo" 
              width={30} 
              height={30} 
              className="rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition-transform duration-300 group-hover:scale-105" 
            />
            <span className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              Everything Clipboard
            </span>
          </Link>

          {/* Desktop Navigation Links (Only Features & Support - No redundant Account link) */}
          <div className="hidden md:flex items-center space-x-7">
            <Link 
              href="/features" 
              className={`text-sm font-medium transition-colors ${
                pathname === "/features" 
                  ? "text-blue-600 dark:text-blue-400 font-semibold" 
                  : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              Features
            </Link>
            <Link 
              href="/support" 
              className={`text-sm font-medium transition-colors ${
                pathname === "/support" 
                  ? "text-blue-600 dark:text-blue-400 font-semibold" 
                  : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              Support
            </Link>
          </div>

          {/* Actions & Profile (Desktop & Mobile Unified) */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden sm:block">
              <ThemeSwitcher />
            </div>

            {loading ? (
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-slate-200/60 dark:bg-slate-800/60 rounded-full animate-pulse" />
            ) : account?.signedIn ? (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Contextual CTA: Download if purchased, Buy if not */}
                {account.purchased ? (
                  <Link
                    href="/account"
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-all duration-200 shadow-sm inline-flex items-center gap-1.5 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Downloads</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={authBusy}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full transition-all duration-200 shadow-md shadow-blue-500/20 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Buy – $3</span>
                  </button>
                )}

                {/* Round Account Avatar Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleUserDropdown}
                    aria-label="User Account Menu"
                    className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md hover:ring-2 hover:ring-blue-400 focus:outline-none transition-all cursor-pointer shrink-0"
                  >
                    {account.displayName ? (
                      account.displayName.charAt(0).toUpperCase()
                    ) : (
                      <User className="w-3.5 h-3.5" />
                    )}
                    {/* Status Dot */}
                    <span 
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        account.purchased ? "bg-emerald-500" : "bg-amber-500"
                      }`} 
                    />
                  </button>

                  {/* Account Dropdown Menu */}
                  {userDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setUserDropdownOpen(false)} 
                      />
                      <div className="absolute right-0 mt-3 w-64 rounded-3xl glass-card p-3 z-50 shadow-2xl border border-slate-200/80 dark:border-slate-700/80 animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                              {account.displayName ? account.displayName.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                {account.displayName || "Account"}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {account.email}
                              </p>
                            </div>
                          </div>
                          
                          <div className="mt-2.5">
                            {account.purchased ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold">
                                <ShieldCheck className="w-3 h-3" /> Lifetime License Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-semibold">
                                Unlicensed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="py-1.5 space-y-1">
                          <Link
                            href="/account"
                            onClick={() => setUserDropdownOpen(false)}
                            className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              {account.purchased ? <Download className="w-3.5 h-3.5 text-blue-500" /> : <User className="w-3.5 h-3.5 text-blue-500" />}
                              {account.purchased ? "Downloads & Setup" : "Account Dashboard"}
                            </span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                          </Link>

                          {!account.purchased && (
                            <button
                              type="button"
                              onClick={() => {
                                setUserDropdownOpen(false);
                                handleCheckout();
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-left cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" />
                                Unlock Lifetime Access ($3)
                              </span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={handleSignOut}
                            disabled={authBusy}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left cursor-pointer"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Sign In button */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={authBusy}
                  className="px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {authBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Sign In"}
                </button>
                {/* Unified Buy button with identical styling */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={authBusy}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full transition-all duration-200 shadow-md shadow-blue-500/20 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Buy – $3</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Hamburger Button */}
            <div className="flex md:hidden items-center">
              <button
                type="button"
                onClick={toggleMobileMenu}
                className="p-1.5 sm:p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer (Only Features & Support - No duplicate account card) */}
        {mobileMenuOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 md:hidden" 
              onClick={() => setMobileMenuOpen(false)} 
            />
            <div className="md:hidden mt-2 rounded-3xl glass-card p-3 shadow-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-2 z-50 relative animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex flex-col space-y-1">
                <Link
                  href="/features"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                    pathname === "/features" 
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  Features
                </Link>
                <Link
                  href="/support"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors ${
                    pathname === "/support" 
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  Support & Help
                </Link>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-3 py-1">
                <span className="text-xs text-slate-500 dark:text-slate-400">Theme</span>
                <ThemeSwitcher />
              </div>
            </div>
          </>
        )}
      </nav>
    </header>
  );
}
