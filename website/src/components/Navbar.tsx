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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-300 pt-3 px-3 sm:px-6">
      <nav className="max-w-7xl mx-auto">
        <div className="glass-nav rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center transition-all duration-300">
          
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 group">
            <Image 
              src="/logo.png" 
              alt="Everything Clipboard Logo" 
              width={32} 
              height={32} 
              className="rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition-transform duration-300 group-hover:scale-105" 
            />
            <span className="text-base sm:text-lg font-bold tracking-tight text-slate-950 dark:text-white">
              Everything Clipboard
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
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
            {account?.signedIn && (
              <Link 
                href="/account" 
                className={`text-sm font-medium transition-colors inline-flex items-center gap-1.5 ${
                  pathname === "/account" 
                    ? "text-blue-600 dark:text-blue-400 font-semibold" 
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                {account.purchased ? "Downloads" : "Account"}
              </Link>
            )}
          </div>

          {/* Right Action Controls */}
          <div className="hidden md:flex items-center space-x-3 sm:space-x-4">
            <ThemeSwitcher />

            {loading ? (
              <div className="w-10 h-10 bg-slate-200/60 dark:bg-slate-800/60 rounded-full animate-pulse" />
            ) : account?.signedIn ? (
              <div className="flex items-center gap-3">
                {/* Contextual CTA Button: Download if purchased, Buy if not */}
                {account.purchased ? (
                  <Link
                    href="/account"
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-all duration-200 shadow-sm inline-flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Apps
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={authBusy}
                    className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-full transition-all duration-200 shadow-md shadow-blue-500/20 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Buy – $3
                  </button>
                )}

                {/* Round Account Avatar Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    aria-label="User Account Menu"
                    className="relative w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md hover:ring-2 hover:ring-blue-400 focus:outline-none transition-all cursor-pointer"
                  >
                    {account.displayName ? (
                      account.displayName.charAt(0).toUpperCase()
                    ) : (
                      <User className="w-4 h-4" />
                    )}
                    {/* Status Dot */}
                    <span 
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        account.purchased ? "bg-emerald-500" : "bg-amber-500"
                      }`} 
                    />
                  </button>

                  {/* Dropdown Menu */}
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
                                Free Tier / Unlicensed
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
              <div className="flex items-center gap-2.5">
                {/* Round Sign In / Register Button for Logged Out */}
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={authBusy}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  {authBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={authBusy}
                  className="px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-full transition-all duration-300 shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Buy – $3
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center space-x-2">
            <ThemeSwitcher />
            
            {/* If logged in on mobile, show the round avatar directly in navbar */}
            {account?.signedIn && (
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs cursor-pointer"
              >
                {account.displayName ? account.displayName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 rounded-3xl glass-card p-4 shadow-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-2">
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
                Support
              </Link>
              {account?.signedIn && (
                <Link
                  href="/account"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-colors flex items-center justify-between ${
                    pathname === "/account" 
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-semibold" 
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <span>{account.purchased ? "Downloads & Setup" : "Account Dashboard"}</span>
                  {account.purchased && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold uppercase">
                      Pro Active
                    </span>
                  )}
                </Link>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              {account?.signedIn ? (
                <>
                  <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-2xl flex items-center gap-3">
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
                  {account.purchased ? (
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full py-3 rounded-full bg-blue-600 text-white text-sm font-semibold shadow-md flex items-center justify-center gap-2 text-center"
                    >
                      <Download className="w-4 h-4" />
                      Open Downloads
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleCheckout();
                      }}
                      className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      Buy Lifetime Access – $3
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignOut();
                    }}
                    className="w-full py-2.5 rounded-2xl text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer text-center"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignIn();
                    }}
                    disabled={authBusy}
                    className="w-full py-3 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {authBusy ? "Connecting..." : "Sign In with Google"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleSignIn();
                    }}
                    disabled={authBusy}
                    className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  >
                    Buy Lifetime Access – $3
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
