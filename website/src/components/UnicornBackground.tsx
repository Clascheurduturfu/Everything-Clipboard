"use client";

import Script from "next/script";
import { useEffect } from "react";

export function UnicornBackground() {
  useEffect(() => {
    // If the script is already loaded and we return to this page, re-initialize
    // @ts-expect-error UnicornStudio is on window
    if (typeof window !== "undefined" && window.UnicornStudio) {
      // @ts-expect-error UnicornStudio is on window
      window.UnicornStudio.init();
    }

    // Cleanup function to prevent WebGL context memory leaks on page navigation
    return () => {
      // @ts-expect-error UnicornStudio is on window
      if (typeof window !== "undefined" && window.UnicornStudio) {
        // @ts-expect-error UnicornStudio is on window
        window.UnicornStudio.destroy();
      }
    };
  }, []);

  return (
    <div className="absolute inset-0 opacity-40 dark:opacity-10" style={{ maskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)", WebkitMaskImage: "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)" }}>
       <div data-us-project="ty3N7ZPaIU7KlWixQFIc" className="absolute w-full h-full left-0 top-0"></div>
       <Script 
         id="unicorn-studio"
         src="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.29/dist/unicornStudio.umd.js"
         strategy="afterInteractive"
         onReady={() => {
           // @ts-expect-error UnicornStudio is on window
           if (window.UnicornStudio && !window.UnicornStudio.isInitialized) {
             // @ts-expect-error UnicornStudio is on window
             window.UnicornStudio.init();
             // @ts-expect-error UnicornStudio is on window
             window.UnicornStudio.isInitialized = true;
           }
         }}
       />
    </div>
  );
}
