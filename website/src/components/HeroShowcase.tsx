import Image from "next/image";

/**
 * Static composition of the four apps. Everything is positioned and sized in
 * percentages of a square stage, so it scales as one piece and nothing can be
 * clipped or overlap anything legible:
 *
 *   - the two desktop screenshots sit on the left, one above the other
 *   - the two phones stand in front on the right, staggered
 *
 * The phones overlap only the empty right-hand side of the macOS menu, where
 * there is no text. The Windows screenshot is 347px wide natively and is
 * never displayed larger than that.
 */
const shot = "absolute overflow-hidden bg-slate-900 shadow-lg ring-1 ring-slate-900/10 dark:ring-white/10";

export function HeroShowcase() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
      <div className={`${shot} left-0 top-[2%] w-[70%] rounded-xl`}>
        <Image
          src="/app-macos.webp"
          alt="The macOS menu bar app, connected, showing the last item received from an Android phone"
          width={664}
          height={520}
          sizes="(min-width: 1024px) 24rem, 70vw"
          className="h-auto w-full"
          preload
        />
      </div>

      <div className={`${shot} left-0 top-[61%] w-[42%] max-w-[347px] rounded-lg`}>
        <Image
          src="/app-windows.webp"
          alt="The Windows tray menu, connected, showing the last item received from a Mac"
          width={347}
          height={242}
          sizes="(min-width: 1024px) 14rem, 42vw"
          className="h-auto w-full"
        />
      </div>

      <div className={`${shot} left-[44%] top-[36%] w-[27%] rounded-[14%/6.4%]`}>
        <Image
          src="/app-ios.webp"
          alt="The iPhone app, connected"
          width={360}
          height={783}
          sizes="(min-width: 1024px) 9rem, 27vw"
          className="h-auto w-full"
        />
      </div>

      <div className={`${shot} right-0 top-[8%] w-[27%] rounded-[14%/6.9%]`}>
        <Image
          src="/app-android.webp"
          alt="The Android app with the clipboard bridge settings"
          width={360}
          height={732}
          sizes="(min-width: 1024px) 9rem, 27vw"
          className="h-auto w-full"
        />
      </div>
    </div>
  );
}
