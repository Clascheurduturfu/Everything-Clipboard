"use client";

import { Copy, Check } from "lucide-react";
import { useRef, useState } from "react";
import { IconSwap } from "@/components/overlay";

const serverUrl = "wss://serv.everything-clipboard.com";

/**
 * Reference only. Since RC5 the apps connect to this relay on their own, so
 * this is deliberately quiet: no accent colour, no status animation.
 */
export function ServerUrl() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  async function copyServerUrl() {
    try {
      await navigator.clipboard.writeText(serverUrl);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="card-inner p-4 sm:p-5">
      <h3 className="text-sm font-medium text-slate-900 dark:text-white">Relay address (optional)</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        The apps connect to this relay by default. You only need it if you changed the server, or to switch back from a
        self-hosted one.
      </p>

      <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-800 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
          {serverUrl}
        </code>
        <button
          type="button"
          onClick={copyServerUrl}
          className={`btn btn-secondary btn-sm ${copied ? "pulse-once" : ""}`}
        >
          <IconSwap
            active={copied}
            on={<Check className="h-4 w-4 text-emerald-500" />}
            off={<Copy className="h-4 w-4 text-slate-400" />}
          />
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
