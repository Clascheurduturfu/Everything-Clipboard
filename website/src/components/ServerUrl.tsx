"use client";

import { Copy, Check } from "lucide-react";
import { useState } from "react";

const serverUrl = "wss://serv.everything-clipboard.com";

export function ServerUrl() {
  const [copied, setCopied] = useState(false);

  async function copyServerUrl() {
    await navigator.clipboard.writeText(serverUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mt-8 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-left dark:border-blue-900 dark:bg-blue-950/30">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">ClipSync server URL</p>
      <div className="mt-2 flex items-center justify-between gap-3">
        <code className="min-w-0 overflow-x-auto text-sm text-slate-800 dark:text-slate-100">{serverUrl}</code>
        <button type="button" onClick={copyServerUrl} className="shrink-0 rounded-lg p-2 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/50" title="Copy server URL">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
