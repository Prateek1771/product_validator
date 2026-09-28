"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownWideNarrow } from "lucide-react";
import { ActionTag, Blocks, Delta, Empty } from "@/components/term";
import { timeAgo } from "@/lib/format";

export type SignalRow = {
  id: string; run_id: string; company: string | null; change_type: string | null; title: string; summary?: string | null;
  impact_score: number | null; confidence?: number | null; recommended_action: string | null; created_at: string;
};

export function SignalsTable({ rows, filters = false }: { rows: SignalRow[]; filters?: boolean }) {
  const router = useRouter();
  const [sort, setSort] = useState<"impact" | "time">("impact");
  const [action, setAction] = useState<string>("all");
  const [text, setText] = useState("");

  const list = useMemo(() => {
    const t = text.toLowerCase();
    return rows
      .filter((r) => action === "all" || r.recommended_action === action)
      .filter((r) => !t || `${r.company} ${r.title} ${r.change_type}`.toLowerCase().includes(t))
      .sort((a, b) => (sort === "impact" ? (b.impact_score ?? -1) - (a.impact_score ?? -1) : b.created_at.localeCompare(a.created_at)));
  }, [rows, sort, action, text]);

  return (
    <div>
      {filters && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="filter company, title, type…" aria-label="Filter signals" className="field h-8 max-w-64" />
          {["all", "alert", "investigate", "monitor", "ignore"].map((a) => (
            <button key={a} onClick={() => setAction(a)} aria-pressed={action === a}
                    className={`rounded-sm px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${action === a ? "bg-amber text-amber-ink" : "text-dim hover:text-fg"}`}>
              {a}
            </button>
          ))}
        </div>
      )}
      {!list.length ? (
        <Empty title="No signals yet">Verified changes from your research runs stream in here, ranked by impact.</Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label w-8 py-2 pl-3" />
                <th className="label py-2">Company</th>
                <th className="label py-2">Type</th>
                <th className="label py-2">Change</th>
                <th className="label py-2">
                  <button onClick={() => setSort(sort === "impact" ? "time" : "impact")} className="inline-flex items-center gap-1 hover:text-fg">
                    Impact {sort === "impact" && <ArrowDownWideNarrow className="size-3" />}
                  </button>
                </th>
                <th className="label py-2">Action</th>
                <th className="label py-2 pr-3 text-right">
                  <button onClick={() => setSort("time")} className="inline-flex items-center gap-1 hover:text-fg">
                    Age {sort === "time" && <ArrowDownWideNarrow className="size-3" />}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} onClick={() => router.push(`/research/${r.run_id}`)} className="cursor-pointer border-b border-line/60 transition last:border-0 hover:bg-hover">
                  <td className="py-2 pl-3"><Delta score={r.impact_score} /></td>
                  <td className="py-2 pr-3 font-mono text-[12px] font-semibold whitespace-nowrap uppercase">{r.company ?? "—"}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-dim uppercase">{r.change_type ?? "—"}</td>
                  <td className="max-w-md py-2 pr-3"><a href={`/research/${r.run_id}`} className="line-clamp-1" onClick={(e) => e.stopPropagation()}>{r.title}</a></td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <span className="flex items-center gap-2"><Blocks value={r.impact_score ?? 0} label="impact" /><span className="font-mono text-[11px] text-dim">{r.impact_score ?? "—"}</span></span>
                  </td>
                  <td className="py-2 pr-3"><ActionTag action={r.recommended_action} /></td>
                  <td className="py-2 pr-3 text-right font-mono text-[11px] whitespace-nowrap text-faint">{timeAgo(r.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
