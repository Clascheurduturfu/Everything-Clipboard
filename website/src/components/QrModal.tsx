"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { QrCode, X, Smartphone, Apple, Check, Copy } from "lucide-react";

type QrModalProps = {
  platform: "android" | "ios";
};

export function QrModalButton({ platform }: QrModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAndroid = platform === "android";
  const title = isAndroid ? "Scan with Android Phone" : "Scan with iPhone / iPad";
  const description = isAndroid
    ? "Scan with your Android camera to open your account and download the ClipSync APK directly."
    : "Scan with your iPhone camera to open your account and install the ClipSync IPA package.";

  const targetUrl = "https://everything-clipboard.com/account";
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(targetUrl)}&margin=10`;

  async function copyLink() {
    await navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const modalContent = open ? (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        className="fixed inset-0" 
        onClick={() => setOpen(false)} 
      />
      
      <div className="relative w-full max-w-sm rounded-3xl bg-slate-900 text-white border border-slate-700 shadow-2xl p-6 sm:p-8 text-center z-10 animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg ${
          isAndroid 
            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
            : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
        }`}>
          {isAndroid ? <Smartphone className="w-7 h-7" /> : <Apple className="w-7 h-7" />}
        </div>

        <h3 className="text-xl font-bold text-white mb-2">
          {title}
        </h3>
        <p className="text-xs text-slate-300 mb-6 font-light leading-relaxed">
          {description}
        </p>

        {/* QR Code Container */}
        <div className="p-3.5 bg-white rounded-2xl inline-block shadow-xl border border-slate-200 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={qrImageUrl} 
            alt={`QR code for ${platform} download`} 
            width={200} 
            height={200} 
            className="rounded-lg" 
          />
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? "Link Copied to Clipboard!" : "Copy Account Link"}</span>
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors cursor-pointer"
        title={`Scan QR code for ${platform}`}
      >
        <QrCode className="w-3.5 h-3.5" />
        <span>Scan QR</span>
      </button>

      {mounted && modalContent && createPortal(modalContent, document.body)}
    </>
  );
}
