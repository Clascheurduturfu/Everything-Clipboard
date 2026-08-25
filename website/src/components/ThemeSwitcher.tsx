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
    return (
      <div className="relative h-6 w-[76px] bg-slate-50 dark:bg-slate-900 px-0.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-800 hidden md:flex" />
    );
  }

  const getPillPosition = () => {
    switch (theme) {
      case "light":
        return "translate-x-[1px]";
      case "system":
        return "translate-x-[25px]";
      case "dark":
        return "translate-x-[49px]";
      default:
        return "translate-x-[25px]";
    }
  };

  return (
    <div className="relative h-6 w-auto bg-slate-50 dark:bg-slate-900 px-0.5 py-1 rounded-full border border-slate-200/50 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 hidden md:flex shadow-inner">
      {/* Animated Pill */}
      <div
        className={`absolute h-[20px] w-6 top-[1px] bg-white dark:bg-slate-700 rounded-full transition-all duration-200 ease-in-out shadow-sm ${getPillPosition()}`}
      />

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
  );
}

export function MobileThemeToggle() {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { resolvedTheme, setTheme } = useTheme();

  if (!mounted) {
    return <div className="w-12 h-6 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center justify-between w-full px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-sm font-medium transition-colors cursor-pointer"
    >
      <div className="flex items-center gap-2.5">
        {isDark ? <Moon className="w-4 h-4 text-blue-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
        <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
      </div>

      {/* Toggle switch pill */}
      <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ${isDark ? "bg-blue-600 justify-end" : "bg-slate-300 justify-start"}`}>
        <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform" />
      </div>
    </button>
  );
}
