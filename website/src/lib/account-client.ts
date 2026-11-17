"use client";

/**
 * One shared view of `/api/account` for the whole page.
 *
 * Before this existed the Navbar, every PurchaseButton and the One Tap
 * component each fetched the endpoint on their own (four requests per page,
 * and the Navbar again on every route change). Now there is a single module
 * level store: the first caller starts the request, everyone else reuses it,
 * and nothing refetches until `refresh()` is called, which only happens after
 * a sign-in or sign-out.
 */

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type AccountInfo = {
  signedIn: boolean;
  displayName?: string | null;
  email?: string | null;
  purchased?: boolean;
  latestOrderId?: string | null;
};

type Snapshot = {
  /** null until the first response has arrived. */
  account: AccountInfo | null;
  loading: boolean;
};

const SIGNED_OUT: AccountInfo = { signedIn: false };

let snapshot: Snapshot = { account: null, loading: true };
let inflight: Promise<AccountInfo> | null = null;
let generation = 0;
const listeners = new Set<() => void>();

function commit(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function request(): Promise<AccountInfo> {
  const current = ++generation;
  const promise = fetch("/api/account", { cache: "no-store" })
    .then((res) => (res.ok ? (res.json() as Promise<AccountInfo>) : SIGNED_OUT))
    .catch(() => SIGNED_OUT)
    .then((account) => {
      // A newer refresh() superseded this request; let it win.
      if (current === generation) {
        inflight = null;
        commit({ account, loading: false });
      }
      return account;
    });
  inflight = promise;
  return promise;
}

/** Cached account if we have one, otherwise the single in-flight request. */
export function getAccountOnce(): Promise<AccountInfo> {
  if (snapshot.account) return Promise.resolve(snapshot.account);
  return inflight ?? request();
}

/** Force a fresh fetch. Call after sign-in or sign-out. */
export function refreshAccount(): Promise<AccountInfo> {
  return request();
}

/** Latest value without subscribing (for use inside async handlers). */
export function peekAccount(): AccountInfo | null {
  return snapshot.account;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot: Snapshot = { account: null, loading: true };

export function useAccount() {
  const { account, loading } = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);

  useEffect(() => {
    void getAccountOnce();
  }, []);

  const refresh = useCallback(() => refreshAccount(), []);
  return { account, loading, refresh };
}

// Start the request as soon as this module is evaluated in the browser, which
// is before React has hydrated the components that need it.
if (typeof window !== "undefined") {
  void getAccountOnce();
}
