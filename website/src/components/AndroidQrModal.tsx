"use client";

import { useState, useEffect } from "react";
import { QrCode, X, Smartphone, Download, Check, ExternalLink } from "lucide-react";

export function AndroidQrModal() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [accountUrl, setAccountUrl] = useState("https://everything-clipboard.com/account");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAccountUrl(`${window.location.origin}/account`);
    }
  }, []);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(accountUrl)}&margin=10`;

  async function copyLink() {
    await navigator.clipboard.writeText(accountUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
        title="Scan QR with your phone"
      >
        <QrCode className="w-3.5 h-3.5" />
        <span>Scan QR</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="fixed inset-0" 
            onClick={() => setOpen(false)} 
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 text-center z-10 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">
              Scan with Phone
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-5 font-light">
              Scan with your phone&apos;s camera to open your account and download the Android APK directly.
            </p>

            <div className="p-3 bg-white rounded-2xl inline-block shadow-md border border-slate-200 mb-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={qrImageUrl} 
                alt="QR Code to open account page on mobile" 
                width={180} 
                height={180} 
                className="rounded-lg" 
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ExternalLink className="w-3.5 h-3.5" />}
                {copied ? "Link Copied!" : "Copy Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
