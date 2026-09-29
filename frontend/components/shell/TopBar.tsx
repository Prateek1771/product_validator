"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LogOut, Search } from "lucide-react";
import { Brand, Kbd } from "@/components/term";
import { signOut } from "@/app/login/actions";
import { getSettings, getSystem } from "@/lib/api";
import { openPalette } from "@/lib/useHotkeys";
import type { SystemStatus, UserSettings } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

const DOT = { ok: "bg-up", exhausted: "bg-down", erroring: "bg-amber", not_configured: "bg-faint" };

export function TopBar({ email }: { email: string }) {
  const [sys, setSys] = useState<SystemStatus | null>(null);
  const [clock, setClock] = useState("");
  const [cfg, setCfg] = useState<UserSettings | null>(null);

  useEffect(() => {
    const load = () => getSystem().then(setSys).catch(() => setSys(null));
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }));
    load();
    tick();
    getSettings().then(setCfg).catch(() => setCfg(null));
    const a = setInterval(load, 30_000);
    const b = setInterval(tick, 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-line bg-bg/90 px-3 backdrop-blur md:px-4" data-print-hide>
      <Link href="/" aria-label="Home"><Brand /></Link>
      <button onClick={() => openPalette()}
              className="ml-2 flex h-8 min-w-0 flex-1 items-center gap-2 rounded border border-line bg-panel px-3 text-left font-mono text-[12px] text-faint transition hover:border-line-2 md:max-w-xl">
        <Search className="size-3.5 shrink-0" />
        <span className="truncate"><span className="text-amber">&gt;</span> research a market, or jump to…</span>
        <span className="ml-auto hidden gap-1 sm:flex"><Kbd>Ctrl</Kbd><Kbd>K</Kbd></span>
      </button>

      <div className="ml-auto hidden items-center gap-4 font-mono text-[11px] text-dim lg:flex">
        {sys && (
          <Link href="/system" className="flex items-center gap-3 hover:text-fg" title="Provider status">
            {sys.providers.map((p) => (
              <span key={p.id} className="flex items-center gap-1.5">
                <span className={`size-1.5 rounded-full ${DOT[p.status]}`} />{p.id === "context" ? "CTX" : p.id.toUpperCase().slice(0, 4)}
              </span>
            ))}
          </Link>
        )}
        <span className="flex items-center gap-1.5">
          <span className={`live-dot size-1.5 rounded-full ${sys ? "bg-up" : "bg-down"}`} />
          {sys ? `LIVE · ${sys.active_runs} RUN${sys.active_runs === 1 ? "" : "S"}` : "API OFFLINE"}
        </span>
        <span className="tabular-nums text-faint" suppressHydrationWarning>{clock}</span>
      </div>

      <ThemeToggle />
      <div className="group relative">
        <button className="relative grid size-8 place-items-center rounded border border-line bg-panel font-mono text-[11px] font-semibold uppercase text-amber" aria-label="Account">
          {email[0]}
          {cfg?.decider.notice && <span className="absolute -top-1 -right-1 size-2 rounded-full bg-amber" aria-label="Notice" />}
        </button>
        <div className="invisible absolute top-9 right-0 w-56 rounded border border-line-2 bg-panel-2 p-1 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
          <p className="truncate px-2.5 py-2 font-mono text-[11px] text-dim">{email}</p>
          {cfg && (
            <Link href="/settings" className="block rounded px-2.5 py-2 font-mono text-[10px] text-dim hover:bg-hover">
              <span className="text-faint">LLM </span>{cfg.effective.strong}<br />
              <span className="text-faint">DECISIONS </span>
              <span className={cfg.decider.engine === "jev" ? "text-up" : "text-amber"}>{cfg.decider.engine === "jev" ? "Jev" : "LLM agent (no OpenRouter key)"}</span>
            </Link>
          )}
          <button onClick={() => signOut()} className="flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-sm hover:bg-hover">
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
