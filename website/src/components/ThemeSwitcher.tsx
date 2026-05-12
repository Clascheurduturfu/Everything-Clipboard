"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

export function ThemeSwitcher() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { theme, setTheme } = useTheme();

  if (!mounted) {
    // Return a placeholder of the exact same size to avoid layout shift
    return (
      <div className="flex items-center space-x-4">
        <div className="relative h-6 w-[76px] bg-slate-50 dark:bg-slate-900 px-0.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-800 hidden xl:flex"></div>
      </div>
    );
  }

  // Determine pill position based on active theme
  const getPillPosition = () => {
    switch (theme) {
      case "light":
        return "translate-x-[1px]";
      case "system":
        return "translate-x-[25px]";
      case "dark":
        return "translate-x-[49px]";
      default:
        return "translate-x-[25px]"; // fallback to system
    }
  };

  return (
    <div className="flex items-center space-x-4">
      <div className="relative h-6 w-auto bg-slate-50 dark:bg-slate-900 px-0.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hidden xl:flex shadow-inner">
        {/* Animated Pill */}
        <div
          className={`absolute h-[20px] w-6 top-[1px] bg-white dark:bg-slate-700 rounded-full transition-all duration-200 ease-in-out shadow-sm ${getPillPosition()}`}
        ></div>

        {/* Light Mode Button */}
        <button
          onClick={() => setTheme("light")}
          className={`relative -top-[1px] -left-[1px] z-10 flex items-center justify-center h-4 w-6 rounded-full transition-colors ${
            theme === "light"
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
          aria-label="Light mode"
          type="button"
        >
          <Sun className="h-3 w-3" />
        </button>

        {/* System Theme Button */}
        <button
          onClick={() => setTheme("system")}
          className={`relative -top-[1px] left-[1px] z-10 flex items-center justify-center h-4 w-6 rounded-full transition-colors ${
            theme === "system"
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
          aria-label="System theme"
          type="button"
        >
          <Monitor className="h-3 w-3" />
        </button>

        {/* Dark Mode Button */}
        <button
          onClick={() => setTheme("dark")}
          className={`relative -top-[1px] left-[1px] z-10 flex items-center justify-center h-4 w-6 rounded-full transition-colors ${
            theme === "dark"
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
          }`}
          aria-label="Dark mode"
          type="button"
        >
          <Moon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
