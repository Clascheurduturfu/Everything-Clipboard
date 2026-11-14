"use client";

import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const OPTIONS = [
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "system", label: "System theme", Icon: Monitor },
  { value: "dark", label: "Dark theme", Icon: Moon },
] as const;

const SEGMENT_REM = 2; // width of one option (w-8)

/**
 * Three-way theme control. The knob travels with a transition on the outer
 * element while an inner element stretches ~12% (area preserved) and relaxes,
 * so the two transforms never fight over the same property.
 */
export function ThemeSwitcher({ className = "hidden lg:flex" }: { className?: string }) {
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  // Bumped on every change so the stretch animation restarts; stays 0 (no
  // animation) until the visitor actually uses the control.
  const [moves, setMoves] = useState(0);

  if (!mounted) {
    return <div className={`h-8 w-[6.25rem] rounded-full border border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900 ${className}`} aria-hidden="true" />;
  }

  const index = Math.max(0, OPTIONS.findIndex((o) => o.value === (theme ?? "system")));

  return (
    <div
      role="group"
      aria-label="Theme"
      className={`relative h-8 items-center rounded-full border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div
        className="absolute left-0.5 top-0.5 h-6 w-8 transition-transform duration-200 ease-in-out"
        style={{ transform: `translateX(${index * SEGMENT_REM}rem)` }}
        aria-hidden="true"
      >
        <div
          key={moves}
          className={`h-full w-full rounded-full bg-white shadow-sm dark:bg-slate-700 ${moves > 0 ? "knob-stretch" : ""}`}
        />
      </div>

      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => {
            if (value !== theme) setMoves((n) => n + 1);
            setTheme(value);
          }}
          aria-label={label}
          aria-pressed={theme === value}
          className={`focus-ring relative z-10 flex h-6 w-8 items-center justify-center rounded-full transition-colors duration-200 ${
            theme === value
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}
