"use client";

import { useState } from "react";
import { QrCode, X, Smartphone, Download, Check } from "lucide-react";

export function AndroidQrModal({ downloadUrl }: { downloadUrl: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // We can construct a QR image URL via quick API or standard QR service
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(downloadUrl)}&margin=10`;

  async function copyLink() {
    await navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
        title="Scan with phone"
      >
        <QrCode className="w-3.5 h-3.5" />
        <span>Scan QR</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setOpen(false)} 
          />
          <div className="relative w-full max-w-sm rounded-[2rem] glass-card p-6 shadow-2xl border border-slate-200 dark:border-slate-700 text-center z-10 animate-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-100 dark:border-emerald-900/50 mx-auto flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 shadow-sm">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Scan to Download Android App
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-6">
              Open your phone&apos;s camera to scan and download the ClipSync APK directly.
            </p>

            <div className="p-3 bg-white rounded-2xl inline-block shadow-md border border-slate-100 mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={qrImageUrl} 
                alt="QR Code to download Android APK" 
                width={200} 
                height={200} 
                className="rounded-lg" 
              />
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Download className="w-3.5 h-3.5" />}
                {copied ? "Link Copied!" : "Copy APK Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
