"use client";

/**
 * Shared behaviour for everything that opens on top of the page: the sign-in
 * and QR dialogs, the account dropdown and the mobile menu.
 *
 *  - usePresence: keeps an element mounted long enough to play its exit
 *    animation, and gives it a frame in the closed state so the enter
 *    animation actually runs. (CSS lives in globals.css: .pop, .overlay-backdrop.)
 *  - useOverlayBehavior: Escape to close, focus moved in on open and returned
 *    to the trigger on close, optional Tab trap, optional page scroll lock,
 *    optional click-outside.
 *  - ModalShell: portal + backdrop + role="dialog" panel built from the two.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";

export const EXIT_MS = 160;

const noopSubscribe = () => () => {};

/** False during SSR and hydration, true afterwards (portal targets exist). */
export function useIsClient() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function usePresence(open: boolean, exitMs: number = EXIT_MS) {
  const [mounted, setMounted] = useState(open);
  const [entered, setEntered] = useState(false);

  // Opening: mount right away (adjusting state during render is the
  // documented pattern for deriving it from a prop).
  if (open && !mounted) setMounted(true);

  // Opening: wait two frames so the closed styles are painted once, then flip
  // to "open" and let the CSS transition run. The timeout is a safety net for
  // pages whose animation frames are throttled; either path may win.
  useEffect(() => {
    if (!open) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true));
    });
    const fallback = window.setTimeout(() => setEntered(true), 80);
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
      window.clearTimeout(fallback);
    };
  }, [open]);

  // Closing: stay mounted for the exit transition, then unmount.
  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setEntered(false);
    }, exitMs);
    return () => window.clearTimeout(timer);
  }, [open, mounted, exitMs]);

  return { mounted: open || mounted, state: open && entered ? ("open" as const) : ("closed" as const) };
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== "hidden",
  );
}

// Two overlays can be active at once for a moment (menu closing while the
// dialog opens), so the scroll lock is reference counted.
let scrollLocks = 0;
let savedOverflow = "";

function lockScroll() {
  if (scrollLocks++ === 0) {
    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
  }
}

function unlockScroll() {
  if (--scrollLocks === 0) {
    document.documentElement.style.overflow = savedOverflow;
  }
}

type OverlayOptions = {
  active: boolean;
  /** Element that receives initial focus and, with trapFocus, contains Tab. */
  containerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  trapFocus?: boolean;
  lockPageScroll?: boolean;
  initialFocus?: "first" | "container" | "none";
  /** A pointer press outside this element closes the overlay. */
  outsideRef?: RefObject<HTMLElement | null>;
};

export function useOverlayBehavior({
  active,
  containerRef,
  onClose,
  trapFocus = true,
  lockPageScroll = true,
  initialFocus = "first",
  outsideRef,
}: OverlayOptions) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!active) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;

    if (container && initialFocus !== "none") {
      const target = initialFocus === "first" ? focusables(container)[0] ?? container : container;
      target.focus({ preventScroll: true });
    }
    if (lockPageScroll) lockScroll();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !trapFocus || !containerRef.current) return;

      const items = focusables(containerRef.current);
      if (items.length === 0) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && (current === first || !containerRef.current.contains(current))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (current === last || !containerRef.current.contains(current))) {
        event.preventDefault();
        first.focus();
      }
    }

    function onPointerDown(event: PointerEvent) {
      const outside = outsideRef?.current;
      if (outside && event.target instanceof Node && !outside.contains(event.target)) {
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    if (outsideRef) document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      if (lockPageScroll) unlockScroll();
      // Hand focus back to whatever opened us, unless the user already moved
      // it somewhere else on purpose.
      const now = document.activeElement;
      if (previouslyFocused && previouslyFocused.isConnected && (now === document.body || !now || container?.contains(now))) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef, trapFocus, lockPageScroll, initialFocus, outsideRef]);
}

/** Two icons crossfading: scale + opacity + blur. */
export function IconSwap({ on, off, active }: { on: ReactNode; off: ReactNode; active: boolean }) {
  return (
    <span className="icon-swap" aria-hidden="true">
      <span data-on={!active}>{off}</span>
      <span data-on={active}>{on}</span>
    </span>
  );
}

type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  panelClassName?: string;
};

export function ModalShell({ open, onClose, label, children, panelClassName = "max-w-md" }: ModalShellProps) {
  const isClient = useIsClient();
  const { mounted, state } = usePresence(open);
  const panelRef = useRef<HTMLDivElement>(null);

  useOverlayBehavior({ active: open, containerRef: panelRef, onClose });

  if (!isClient || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="overlay-backdrop absolute inset-0" data-state={state} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        data-state={state}
        className={`pop card relative isolate w-full bg-white p-6 shadow-xl outline-none sm:p-8 dark:bg-slate-900 ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
