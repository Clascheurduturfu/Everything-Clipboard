/**
 * Muted, looping product demo for the landing hero: text, then a photo, copied
 * on a PC and received by the real Android app.
 *
 * It plays even when the OS reports prefers-reduced-motion: Windows reports
 * that whenever "Animation effects" is off, and pausing left desktop visitors
 * with a still frame (same reasoning as the WebGL background).
 */
export function HeroLoop() {
  return (
    <video
      className="block h-full w-full object-cover"
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
