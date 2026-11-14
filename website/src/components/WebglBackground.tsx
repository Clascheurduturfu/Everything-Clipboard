"use client";

import { useEffect, useRef, useState } from "react";

const SCRIPT_SRC =
  "https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js";
const PROJECT_ID = "ty3N7ZPaIU7KlWixQFIc";

type UnicornStudio = {
  init: () => Promise<unknown>;
};

declare global {
  interface Window {
    UnicornStudio?: UnicornStudio;
  }
}

function loadScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.UnicornStudio) return resolve();
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("WebGL background script failed to load"));
    document.head.appendChild(script);
  });
}

/**
 * The animated WebGL backdrop, loaded so it can never slow the page down:
 *
 * - It lives in the root layout, so it is created once and survives page
 *   navigation instead of being torn down and rebuilt on every route.
 * - Nothing is downloaded until the page has finished loading and the browser
 *   is idle. The static `.page-bg` is what paints first; this fades in over it.
 * - It is skipped entirely for reduced-motion and data-saver users.
 */
export function WebglBackground() {
  const [ready, setReady] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData) return;

    let cancelled = false;

    const start = () => {
      if (cancelled || started.current) return;
      started.current = true;
      loadScript()
        .then(() => window.UnicornStudio?.init())
        .then(() => {
          if (!cancelled) setReady(true);
        })
        .catch(() => {
          /* The static background stays; nothing else depends on this. */
        });
    };

    const whenIdle = () => {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(start, { timeout: 3000 });
      } else {
        setTimeout(start, 800);
      }
    };

    if (document.readyState === "complete") {
      whenIdle();
    } else {
      window.addEventListener("load", whenIdle, { once: true });
    }

    return () => {
      cancelled = true;
      window.removeEventListener("load", whenIdle);
    };
  }, []);

  return (
    <div className={`webgl-bg ${ready ? "webgl-bg-ready" : ""}`} aria-hidden="true">
      <div data-us-project={PROJECT_ID} className="absolute inset-0" />
    </div>
  );
}
