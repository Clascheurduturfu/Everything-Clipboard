"use client";

import { useEffect, useRef } from "react";

/**
 * Muted, looping product demo for the landing hero: text, then a photo, copied
 * on a PC and received by the real Android app. Visitors who ask for reduced
 * motion get the poster frame instead of playback.
 */
export function HeroLoop() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => {
      if (query.matches) {
        video.pause();
      } else {
        video.play().catch(() => {});
      }
    };
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  return (
    <video
      ref={ref}
      className="block w-full h-full object-cover"
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster="/hero/hero-loop-poster.jpg"
      aria-label="Text and a photo copied on a Windows PC arrive end-to-end encrypted on an Android phone running Everything Clipboard"
    >
      <source src="/hero/hero-loop.webm" type="video/webm" />
      <source src="/hero/hero-loop.mp4" type="video/mp4" />
    </video>
  );
}
