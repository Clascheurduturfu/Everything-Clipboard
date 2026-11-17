"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { Menu, X, User, LogOut, Download, ShieldCheck, ArrowRight } from "lucide-react";
import { useAccount } from "@/lib/account-client";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { AuthModal } from "@/components/AuthModal";
import { IconSwap, usePresence, useOverlayBehavior } from "@/components/overlay";

const desktopLink = (active: boolean) =>
  `focus-ring rounded-md text-sm font-medium transition-colors ${
    active
      ? "text-blue-600 dark:text-blue-400"
      : "text-slate-600 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white"
  }`;

const menuRow = (active: boolean) =>
  `focus-ring block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
    active
      ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
  }`;

const index = (i: number) => ({ "--i": i }) as CSSProperties;

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { account, loading, refresh } = useAccount();
  const [authBusy, setAuthBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalIsBuying, setAuthModalIsBuying] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const userWrapRef = useRef<HTMLDivElement>(null);
  const userPanelRef = useRef<HTMLDivElement>(null);

  const menu = usePresence(menuOpen);
  const user = usePresence(userOpen);

  // Mobile menu behaves like a dialog: traps focus within the header, locks
  // page scroll, closes on Escape and returns focus to the menu button.
  useOverlayBehavior({
    active: menuOpen,
    containerRef: navRef,
    onClose: () => setMenuOpen(false),
    initialFocus: "none",
  });

  // Account dropdown: Escape, click outside, focus returns to the avatar.
  useOverlayBehavior({
    active: userOpen,
    containerRef: userPanelRef,
    onClose: () => setUserOpen(false),
    trapFocus: false,
    lockPageScroll: false,
    initialFocus: "container",
    outsideRef: userWrapRef,
  });

  // The menu button disappears at the desktop breakpoint; do not leave the
  // page scroll-locked behind it.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (query.matches) setMenuOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  function openLoginModal(isBuying = false) {
    setAuthModalIsBuying(isBuying);
    setAuthModalOpen(true);
    setMenuOpen(false);
    setUserOpen(false);
  }

  async function handleSignOut() {
    setAuthBusy(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      // Clean up any Firebase user an older build left in IndexedDB. Loaded
      // lazily and not awaited: the cookie is already gone.
      void import("@/lib/auth-flow").then((m) => m.clearFirebaseUser()).catch(() => {});
      await refresh();
      if (pathname.startsWith("/account")) {
        router.push("/");
      }
      router.refresh();
      setUserOpen(false);
      setAuthBusy(false);
      // Bring passive One Tap back for the signed-out visitor.
      window.__reinitOneTap?.();
    } catch (err) {
      console.error("Sign-out error:", err);
      setAuthBusy(false);
    }
  }

  function handleCheckout() {
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

  function onUserMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    const next = event.key === "ArrowDown" ? (current + 1) % items.length : (current - 1 + items.length) % items.length;
    items[next].focus();
  }

  const initial = account?.displayName?.charAt(0).toUpperCase();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 px-4 pt-4 sm:px-6">
        <nav ref={navRef} aria-label="Main" className="mx-auto max-w-6xl">
          <div className="glass-nav flex items-center justify-between gap-3 rounded-full py-2 pl-4 pr-2 sm:pl-5 sm:pr-3">
            <Link href="/" className="focus-ring flex shrink-0 items-center gap-2.5 rounded-full">
              <Image
                src="/logo-72.png"
                alt=""
                width={36}
                height={36}
                unoptimized
                preload
                className="rounded-xl"
              />
              <span className="text-base font-medium tracking-tight text-slate-950 dark:text-white">
                Everything Clipboard
              </span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 lg:gap-5">
              <div className="hidden items-center gap-5 lg:flex">
                <Link href="/features" className={desktopLink(pathname === "/features")} aria-current={pathname === "/features" ? "page" : undefined}>
                  Features
                </Link>
                <Link href="/support" className={desktopLink(pathname === "/support")} aria-current={pathname === "/support" ? "page" : undefined}>
                  Support
                </Link>
              </div>

              <ThemeSwitcher />

              {/* Primary action. Its slot keeps a fixed size while the account loads. */}
              <div className="hidden sm:block">
                {loading ? (
                  <div className="h-9 w-[6.5rem] rounded-full bg-slate-200/70 dark:bg-slate-800/70" aria-hidden="true" />
                ) : account?.purchased ? (
                  <Link href="/account" className="btn btn-primary btn-sm fade-in min-w-[6.5rem]">
                    <Download className="h-4 w-4" />
                    <span>Download</span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={authBusy}
                    className="btn btn-primary btn-sm fade-in min-w-[6.5rem]"
                  >
                    Buy for $3
                  </button>
                )}
              </div>

              {/* Account slot: placeholder, avatar, or sign-in link, all the same size. */}
              {loading ? (
                <div className="h-9 w-9 rounded-full bg-slate-200/70 sm:w-[4.5rem] dark:bg-slate-800/70" aria-hidden="true" />
              ) : account?.signedIn ? (
                <div ref={userWrapRef} className="relative flex justify-center sm:w-[4.5rem]">
                  <button
                    type="button"
                    onClick={() => setUserOpen((open) => !open)}
                    aria-label="Account menu"
                    aria-haspopup="menu"
                    aria-expanded={userOpen}
                    aria-controls="account-menu"
                    className="focus-ring fade-in relative flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-medium text-white"
                  >
                    {initial ?? <User className="h-4 w-4" />}
                    <span
                      className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        account.purchased ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                    />
                  </button>

                  {user.mounted && (
                    <div
                      ref={userPanelRef}
                      id="account-menu"
                      role="menu"
                      aria-label="Account"
                      tabIndex={-1}
                      data-state={user.state}
                      onKeyDown={onUserMenuKeyDown}
                      style={{ "--pop-origin": "top right" } as CSSProperties}
                      className="pop card absolute right-0 top-full z-50 mt-3 w-64 bg-white p-2 outline-none dark:bg-slate-900"
                    >
                      <div className="stagger-item border-b border-slate-100 px-3 pb-3 pt-2 dark:border-slate-800" style={index(0)}>
                        <p className="truncate text-sm font-medium text-slate-900 dark:text-white">
                          {account.displayName || "Account"}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">{account.email}</p>
                        <p className="stagger-late mt-2">
                          {account.purchased ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                              <ShieldCheck className="h-3 w-3" /> Lifetime license
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                              No license yet
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="space-y-0.5 py-1.5">
                        <Link
                          href="/account"
                          role="menuitem"
                          onClick={() => setUserOpen(false)}
                          className="stagger-item focus-ring flex items-center justify-between rounded-xl px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          style={index(1)}
                        >
                          <span>{account.purchased ? "Downloads and setup" : "Account"}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                        </Link>

                        {!account.purchased && (
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              setUserOpen(false);
                              handleCheckout();
                            }}
                            className="stagger-item focus-ring flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-950/40"
                            style={index(2)}
                          >
                            <span>Buy lifetime access for $3</span>
                          </button>
                        )}
                      </div>

                      <div className="border-t border-slate-100 pt-1.5 dark:border-slate-800">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={handleSignOut}
                          disabled={authBusy}
                          className="stagger-item focus-ring flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                          style={index(3)}
                        >
                          <LogOut className="h-4 w-4 text-slate-400" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openLoginModal(false)}
                  className="btn btn-ghost btn-sm fade-in hidden w-[4.5rem] px-0 sm:inline-flex"
                >
                  Sign in
                </button>
              )}

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                className="btn btn-ghost h-9 w-9 shrink-0 px-0 lg:hidden"
              >
                <IconSwap active={menuOpen} on={<X className="h-5 w-5" />} off={<Menu className="h-5 w-5" />} />
              </button>
            </div>
          </div>

          {menu.mounted && (
            <>
              <div
                className="overlay-backdrop fixed inset-0 -z-10 lg:hidden"
                data-state={menu.state}
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                id="mobile-menu"
                data-state={menu.state}
                style={{ "--pop-origin": "top right" } as CSSProperties}
                className="pop card relative mt-2 bg-white p-2 lg:hidden dark:bg-slate-900"
              >
                <Link
                  href="/features"
                  onClick={() => setMenuOpen(false)}
                  aria-current={pathname === "/features" ? "page" : undefined}
                  className={`stagger-item ${menuRow(pathname === "/features")}`}
                  style={index(0)}
                >
                  Features
                </Link>
                <Link
                  href="/support"
                  onClick={() => setMenuOpen(false)}
                  aria-current={pathname === "/support" ? "page" : undefined}
                  className={`stagger-item ${menuRow(pathname === "/support")}`}
                  style={index(1)}
                >
                  Support
                </Link>

                {!loading && !account?.signedIn && (
                  <button
                    type="button"
                    onClick={() => openLoginModal(false)}
                    className={`stagger-item w-full text-left sm:hidden ${menuRow(false)}`}
                    style={index(2)}
                  >
                    Sign in
                  </button>
                )}

                <div className="stagger-item px-2 pt-2 sm:hidden" style={index(3)}>
                  {account?.purchased ? (
                    <Link href="/account" onClick={() => setMenuOpen(false)} className="btn btn-primary w-full">
                      <Download className="h-4 w-4" />
                      <span>Download</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleCheckout();
                      }}
                      disabled={authBusy}
                      className="btn btn-primary w-full"
                    >
                      Buy for $3
                    </button>
                  )}
                </div>

                <div className="stagger-item mt-2 flex items-center justify-between border-t border-slate-100 px-4 pb-1 pt-3 dark:border-slate-800" style={index(4)}>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Theme</span>
                  <ThemeSwitcher className="flex" />
                </div>
              </div>
            </>
          )}
        </nav>
      </header>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        isBuying={authModalIsBuying}
      />
    </>
  );
}
