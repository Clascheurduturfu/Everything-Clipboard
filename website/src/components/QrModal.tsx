"use client";

import { useRef, useState } from "react";
import { QrCode, X, Smartphone, Apple, Check, Copy } from "lucide-react";
import { IconSwap, ModalShell } from "@/components/overlay";

type QrModalProps = {
  platform: "android" | "ios";
};

const TARGET_URL = "https://www.everything-clipboard.com/account";

export function QrModalButton({ platform }: QrModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);

  const isAndroid = platform === "android";
  const title = isAndroid ? "Open on your Android phone" : "Open on your iPhone or iPad";
  const description = isAndroid
    ? "Scan this code with your phone camera to open your account page, then download the APK."
    : "Scan this code with your camera to open your account page, then download the IPA. iOS apps are sideloaded, so you will install it with a tool such as AltStore or Sideloadly.";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(TARGET_URL);
    } catch {
      return;
    }
    setCopied(true);
    window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="focus-ring relative z-10 inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-slate-500 transition-colors hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
      >
        <QrCode className="h-3.5 w-3.5" />
        <span>Scan QR</span>
      </button>

      <ModalShell open={open} onClose={() => setOpen(false)} label={title} panelClassName="max-w-sm text-center">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="focus-ring absolute right-4 top-4 rounded-full p-2 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="icon-tile mx-auto mb-4 h-12 w-12">
          {isAndroid ? <Smartphone className="h-6 w-6" /> : <Apple className="h-6 w-6" />}
        </div>

        <h2 className="mb-2 text-xl font-medium text-slate-950 dark:text-white">{title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>

        {/* The QR image is only requested while this dialog is open. */}
        <div className="mb-6 inline-block rounded-xl border border-slate-200 bg-white p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(TARGET_URL)}&margin=10`}
            alt={`QR code that opens the account page on your ${isAndroid ? "Android phone" : "iPhone or iPad"}`}
            width={200}
            height={200}
            referrerPolicy="no-referrer"
          />
        </div>

        <button
          type="button"
          onClick={copyLink}
          className={`btn btn-secondary w-full ${copied ? "pulse-once" : ""}`}
        >
          <IconSwap
            active={copied}
            on={<Check className="h-4 w-4 text-emerald-500" />}
            off={<Copy className="h-4 w-4 text-slate-400" />}
          />
          <span>{copied ? "Link copied" : "Copy account link"}</span>
        </button>
      </ModalShell>
    </>
  );
}
