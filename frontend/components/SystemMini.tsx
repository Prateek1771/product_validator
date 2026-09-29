"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Blocks } from "@/components/term";
import { getSystem } from "@/lib/api";
import type { ProviderStatus, SystemStatus } from "@/lib/types";

const DOT = { ok: "bg-up", exhausted: "bg-down", erroring: "bg-amber", not_configured: "bg-faint" };
const LABEL = { ok: "OK", exhausted: "NO CREDIT", erroring: "ERRORS", not_configured: "NO KEY" };

export function creditPct(p: ProviderStatus): number | null {
  const c = p.credits;
  if (!c) return null;
  if (c.remaining_usd != null && c.total_usd) return (c.remaining_usd / c.total_usd) * 100;
  if (c.remaining != null && c.total) return (c.remaining / c.total) * 100;
  if (c.used != null && c.total) return 100 - (c.used / c.total) * 100;
  return null;
}

export function SystemMini() {
  const [sys, setSys] = useState<SystemStatus | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    getSystem().then(setSys).catch(() => setErr(true));
  }, []);
  if (err) return <p className="px-3 py-4 font-mono text-[12px] text-down">ERR backend unreachable</p>;
  if (!sys) return <div className="space-y-2 p-3">{[0, 1, 2, 3].map((i) => <div key={i} className="scan h-6 rounded" />)}</div>;
  return (
    <ul className="divide-y divide-line/60">
      {sys.providers.map((p) => {
        const pct = creditPct(p);
        return (
          <li key={p.id}>
            <Link href="/system" className="flex items-center gap-3 px-3 py-2.5 hover:bg-hover">
              <span className={`size-1.5 rounded-full ${DOT[p.status]}`} />
              <span className="w-24 truncate font-mono text-[12px]">{p.name.replace(" (OpenRouter)", "")}</span>
              {pct != null ? <Blocks value={pct} tone={pct < 15 ? "down" : pct < 40 ? "amber" : "up"} label="credits" /> : <span className="font-mono text-[10px] text-faint">-</span>}
              <span className={`ml-auto font-mono text-[10px] ${p.status === "ok" ? "text-dim" : "text-down"}`}>{LABEL[p.status]}</span>
            </Link>
          </li>
        );
      })}
      <li className="flex items-center gap-2 px-3 py-2 font-mono text-[10px] text-faint">
        ROUTE {sys.search_chain.map((p) => (p === sys.active_provider ? `[${p.toUpperCase()}]` : p.toUpperCase())).join(" → ")}
      </li>
    </ul>
  );
}
