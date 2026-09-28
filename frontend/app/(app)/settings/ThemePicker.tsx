"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { setTheme, useTheme, type Theme } from "@/components/shell/ThemeToggle";

const OPTS: { id: Theme; label: string; icon: typeof Sun; hint: string }[] = [
  { id: "dark", label: "Terminal", icon: Moon, hint: "Dark, amber accents" },
  { id: "light", label: "Paper", icon: Sun, hint: "Light, high contrast" },
  { id: "system", label: "System", icon: Monitor, hint: "Follow the OS" },
];

export function ThemePicker() {
  const theme = useTheme();
  return (
    <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="Theme">
      {OPTS.map(({ id, label, icon: Icon, hint }) => (
        <button key={id} role="radio" aria-checked={theme === id} onClick={() => setTheme(id)}
                className={`flex items-center gap-3 rounded border p-3 text-left transition ${theme === id ? "border-amber bg-amber-soft" : "border-line hover:border-line-2"}`}>
          <Icon className={`size-4 ${theme === id ? "text-amber" : "text-dim"}`} />
          <span>
            <span className="block font-mono text-[12px] font-semibold uppercase tracking-wider">{label}</span>
            <span className="block text-xs text-dim">{hint}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
