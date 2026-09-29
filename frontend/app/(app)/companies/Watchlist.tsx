"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronRight, Search } from "lucide-react";
import { ActionTag, Blocks, Empty, Favicon, ImpactTag } from "@/components/term";
import { timeAgo } from "@/lib/format";
import { openPalette } from "@/lib/useHotkeys";

export type WatchRow = {
  id: string; name: string; domain: string | null; top: number; n: number; last: string | null;
  changes: { id: string; run_id: string; title: string; impact_score: number | null; recommended_action: string | null; created_at: string }[];
};

export function Watchlist({ rows }: { rows: WatchRow[] }) {
  const [open, setOpen] = useState<string | null>(rows[0]?.id ?? null);
  if (!rows.length) return <Empty title="No companies yet">Companies are added as your research mentions them.</Empty>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left">
            <th className="label w-8 py-2 pl-3" />
            <th className="label py-2">Company</th>
            <th className="label py-2">Domain</th>
            <th className="label py-2">Max impact</th>
            <th className="label py-2 text-right">Changes</th>
            <th className="label py-2 pr-3 text-right">Last change</th>
            <th className="w-10" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <Fragment key={c.id}>
              <tr className="cursor-pointer border-b border-line/60 hover:bg-hover" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id}>
                <td className="py-2.5 pl-3"><ChevronRight className={`size-3.5 text-dim transition ${open === c.id ? "rotate-90 text-amber" : ""}`} /></td>
                <td className="py-2.5 pr-3">
                  <span className="flex items-center gap-2 font-mono text-[12px] font-semibold uppercase"><Favicon url={c.domain ? `https://${c.domain}` : null} />{c.name}</span>
                </td>
                <td className="py-2.5 pr-3 font-mono text-[11px] text-dim">{c.domain ?? "-"}</td>
                <td className="py-2.5 pr-3"><span className="flex items-center gap-2"><Blocks value={c.top} label="max impact" /><span className="font-mono text-[11px] text-dim">{c.n ? c.top : "-"}</span></span></td>
                <td className="py-2.5 pr-3 text-right font-mono text-[12px]">{c.n}</td>
                <td className="py-2.5 pr-3 text-right font-mono text-[11px] text-faint">{c.last ? timeAgo(c.last) : "-"}</td>
                <td className="pr-3">
                  <button onClick={(e) => { e.stopPropagation(); openPalette(`What changed at ${c.name} recently? Pricing, models, products and docs.`); }}
                          className="btn w-8 px-0" aria-label={`Research ${c.name}`} title={`Research ${c.name}`}><Search className="size-3.5" /></button>
                </td>
              </tr>
              {open === c.id && (
                <tr className="border-b border-line bg-panel-2">
                  <td />
                  <td colSpan={6} className="py-2 pr-3">
                    {c.changes.length ? (
                      <ul className="space-y-0.5">
                        {c.changes.slice(0, 6).map((ch) => (
                          <li key={ch.id}>
                            <Link href={`/research/${ch.run_id}`} className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-hover">
                              <ImpactTag score={ch.impact_score} />
                              <span className="min-w-0 flex-1 truncate">{ch.title}</span>
                              <ActionTag action={ch.recommended_action} />
                              <span className="w-24 text-right font-mono text-[11px] text-faint">{timeAgo(ch.created_at)}</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="px-2 py-1.5 font-mono text-[12px] text-faint">{"// "}no verified changes yet</p>}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
