"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase-client";
import { ThemeSwitcher, MobileThemeToggle } from "@/components/ThemeSwitcher";
import { AuthModal } from "@/components/AuthModal";
import { 
  Menu, 
  X, 
  User, 
  LogOut, 
  Download, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Sparkles
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
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalIsBuying, setAuthModalIsBuying] = useState(false);

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

  function openLoginModal(isBuying = false) {
    setAuthModalIsBuying(isBuying);
    setAuthModalOpen(true);
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
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
      openLoginModal(true);
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
    <>
      <header className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pt-4 px-4 sm:px-6">
        <nav className="max-w-7xl mx-auto">
          <div className="glass-nav rounded-full px-6 py-3 flex justify-between items-center transition-all duration-300">
            
            {/* Brand Logo & Name */}
            <Link href="/" className="flex items-center space-x-3 group">
              <Image 
                src="/logo.png" 
                alt="Everything Clipboard Logo" 
                width={36} 
                height={36} 
                className="rounded-xl shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition-transform duration-300 group-hover:scale-105" 
              />
              <span className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
                Everything Clipboard
              </span>
            </Link>

            {/* Right Navigation & Controls */}
            <div className="flex items-center space-x-4 sm:space-x-6">
              
              {/* Desktop Navigation Links on the Right */}
              <Link 
                href="/features" 
                className={`hidden sm:block text-sm font-medium transition-colors ${
                  pathname === "/features" 
                    ? "text-blue-600 dark:text-blue-400 font-semibold" 
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                Features
              </Link>
              <Link 
                href="/support" 
                className={`hidden sm:block text-sm font-medium transition-colors ${
                  pathname === "/support" 
                    ? "text-blue-600 dark:text-blue-400 font-semibold" 
                    : "text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
              >
                Support
              </Link>

              {/* Desktop Theme Switcher */}
              <ThemeSwitcher />

              {/* CTA Button: Get Everything Clipboard (or Download if purchased) */}
              {loading ? (
                <div className="w-28 h-9 bg-slate-200/60 dark:bg-slate-800/60 rounded-full animate-pulse hidden sm:block" />
              ) : account?.purchased ? (
                <Link
                  href="/account"
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-blue-600 hover:bg-blue-500 rounded-full transition-all duration-300 shadow-md inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={authBusy}
                  className="px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-200 rounded-full transition-all duration-300 shadow-md inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Get Everything Clipboard</span>
                </button>
              )}

              {/* User Avatar (when signed in) or Login / Register button (when signed out) */}
              {account?.signedIn ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleUserDropdown}
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

                  {/* Account Dropdown Menu */}
                  {userDropdownOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setUserDropdownOpen(false)} 
                      />
                      <div className="absolute right-0 mt-3 w-64 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-3.5 z-50 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
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
              ) : (
                <button
                  type="button"
                  onClick={() => openLoginModal(false)}
                  className="hidden sm:inline-flex px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                >
                  Login / Register
                </button>
              )}

              {/* Mobile Hamburger Button */}
              <div className="flex sm:hidden items-center">
                <button
                  type="button"
                  onClick={toggleMobileMenu}
                  className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>

            </div>
          </div>

          {/* Mobile Navigation Drawer (Clean Opaque Backdrop) */}
          {mobileMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40 sm:hidden bg-slate-950/40 backdrop-blur-sm" 
                onClick={() => setMobileMenuOpen(false)} 
              />
              <div className="sm:hidden mt-2 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl p-4 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-3 z-50 relative animate-in fade-in slide-in-from-top-2 duration-150">
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
                  {!account?.signedIn && (
                    <button
                      type="button"
                      onClick={() => openLoginModal(false)}
                      className="w-full text-left px-4 py-2.5 rounded-2xl text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 cursor-pointer"
                    >
                      Login / Register with Google
                    </button>
                  )}
                </div>

                {/* Mobile 2-Way Theme Toggle Switch */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <MobileThemeToggle />
                </div>
              </div>
            </>
          )}
        </nav>
      </header>

      {/* Global Auth Modal for Clean Login / Register */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={fetchAccount}
        isBuying={authModalIsBuying}
      />
    </>
  );
}
