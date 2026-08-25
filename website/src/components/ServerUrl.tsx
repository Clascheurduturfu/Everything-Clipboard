"use client";

import { Copy, Check, Server, Shield, Key } from "lucide-react";
import { useState } from "react";

const serverUrl = "wss://serv.everything-clipboard.com";

export function ServerUrl() {
  const [copied, setCopied] = useState(false);

  async function copyServerUrl() {
    await navigator.clipboard.writeText(serverUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="mt-10 rounded-3xl glass-card p-6 md:p-8 border border-blue-200/60 dark:border-blue-900/60 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm">
          <Server className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Official Relay Server Connection
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Use our pre-configured, ultra-low latency relay or your own self-hosted instance.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-slate-50 dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5 min-w-0 pl-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <code className="text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-200 truncate">
            {serverUrl}
          </code>
        </div>
        <button
          type="button"
          onClick={copyServerUrl}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? "Copied to Clipboard" : "Copy Server URL"}</span>
        </button>
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <Key className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">Your Private Encryption Key</span>
            Set the identical passphrase in all your apps. Your clipboard text is encrypted locally before transmission.
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-white/40 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">Zero-Knowledge Architecture</span>
            Even on our servers, no unencrypted data or keys are ever stored or readable.
          </div>
        </div>
      </div>
    </div>
  );
}
