"use client";

/**
 * Coordinator for Google Identity Services.
 *
 * `window.google.accounts.id` is a *singleton*: `initialize()` replaces the
 * client config and the credential callback globally, for every button already
 * rendered on the page.  This site mounts four things that each want to call
 * it - `GoogleOneTap` in the layout, plus one `AuthModal` inside `Navbar` and
 * one inside every `PurchaseButton` (the homepage has two).  Whichever called
 * `initialize()` last won, so the visible button was frequently wired to a
 * different component's callback and clicking it did nothing, or signed the
 * user in and reloaded instead of continuing to checkout.
 *
 * This module hands out an exclusive lease. An open modal outranks passive One
 * Tap, so One Tap can never stomp a dialog the user is actually looking at.
 *
 * It deliberately does *not* change how sign-in works: the FedCM flags, the
 * invisible GIS overlay and the bottom-right One Tap prompt all stay exactly
 * as they were. It only stops the callers racing each other.
 */

type GisIdApi = NonNullable<Window["google"]>["accounts"]["id"];
type GisInitConfig = Parameters<GisIdApi["initialize"]>[0];

const PRIORITY = {
  onetap: 0,
  modal: 10,
} as const;

export type GisOwnerKind = keyof typeof PRIORITY;

const READY_POLL_MS = 150;
const READY_TIMEOUT_MS = 20_000;

let currentOwner: string | null = null;
let currentPriority = -1;

const readyWaiters = new Set<() => void>();
const releaseWaiters = new Set<() => void>();

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollStartedAt = 0;

export function getGis(): GisIdApi | null {
  if (typeof window === "undefined") return null;
  return window.google?.accounts?.id ?? null;
}

function stopPolling() {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling() {
  if (pollTimer !== null || typeof window === "undefined") return;
  pollStartedAt = Date.now();
  pollTimer = setInterval(() => {
    if (getGis()) {
      stopPolling();
      const waiters = [...readyWaiters];
      readyWaiters.clear();
      waiters.forEach((cb) => {
        try {
          cb();
        } catch {
          /* a broken subscriber must not take the others down */
        }
      });
      return;
    }
    if (Date.now() - pollStartedAt > READY_TIMEOUT_MS) {
      // The GIS script is not coming (blocked, offline, extension). Give up so
      // callers stop waiting and fall back to the popup flow.
      stopPolling();
      readyWaiters.clear();
    }
  }, READY_POLL_MS);
}

/**
 * Run `cb` once the GIS script is available. Fires immediately if it already
 * is. Returns an unsubscribe function for effect cleanup.
 */
export function onGisReady(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  if (getGis()) {
    cb();
    return () => {};
  }
  readyWaiters.add(cb);
  startPolling();
  return () => {
    readyWaiters.delete(cb);
  };
}

/**
 * Take the lease. Granted when nothing holds it, the caller already holds it,
 * or the caller outranks the current holder.
 */
export function acquire(ownerId: string, kind: GisOwnerKind): boolean {
  const priority = PRIORITY[kind];
  if (currentOwner !== null && currentOwner !== ownerId && priority < currentPriority) {
    return false;
  }
  currentOwner = ownerId;
  currentPriority = priority;
  return true;
}

export function holdsLease(ownerId: string): boolean {
  return currentOwner === ownerId;
}

export function release(ownerId: string): void {
  if (currentOwner !== ownerId) return;
  currentOwner = null;
  currentPriority = -1;
  const waiters = [...releaseWaiters];
  releaseWaiters.clear();
  waiters.forEach((cb) => {
    try {
      cb();
    } catch {
      /* ignore */
    }
  });
}

/** Subscribe to "the lease became free" so passive One Tap can re-arm. */
export function onRelease(cb: () => void): () => void {
  releaseWaiters.add(cb);
  return () => {
    releaseWaiters.delete(cb);
  };
}

/** Call `initialize()` only if `ownerId` still holds the lease. */
export function initializeFor(ownerId: string, config: GisInitConfig): boolean {
  const gis = getGis();
  if (!gis || currentOwner !== ownerId) return false;
  try {
    gis.initialize(config);
    return true;
  } catch (err) {
    console.error("GIS initialize failed:", err);
    return false;
  }
}

/** Dismiss any visible One Tap prompt. Safe to call at any time. */
export function cancelPrompt(): void {
  try {
    getGis()?.cancel?.();
  } catch {
    /* ignore */
  }
}
