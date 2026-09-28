"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

export type Theme = "dark" | "light" | "system";
const ORDER: Theme[] = ["dark", "light", "system"];
const ICON = { dark: Moon, light: Sun, system: Monitor };

const listeners = new Set<() => void>();
const read = (): Theme => (document.documentElement.dataset.theme as Theme) || "dark";

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("theme", t);
  } catch {}
  listeners.forEach((l) => l());
}

export function useTheme() {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    read,
    () => "dark" as Theme,
  );
}

export function ThemeToggle() {
  const theme = useTheme();
  const Icon = ICON[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  return (
    <button onClick={() => setTheme(next)} className="btn w-8 px-0" aria-label={`Theme: ${theme}. Switch to ${next}`} title={`Theme: ${theme}`}>
      <Icon className="size-3.5" />
    </button>
  );
}
