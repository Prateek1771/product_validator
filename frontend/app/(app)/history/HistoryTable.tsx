"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Empty, Kbd, STATUS_TONE, Tag } from "@/components/term";
import { timeAgo } from "@/lib/format";
import { playbookLabel } from "@/lib/playbooks";
import { useHotkeys } from "@/lib/useHotkeys";

export type HistoryRow = {
  id: string; query: string; mode: string; playbook?: string; status: string; created_at: string; duration: number | null;
  changes: { count: number }[]; sources: { count: number }[];
};

export function HistoryTable({ rows }: { rows: HistoryRow[] }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState("all");
  const [mode, setMode] = useState("all");
  const [sel, setSel] = useState(0);

  const list = useMemo(() => rows.filter((r) =>
    (status === "all" || r.status === status || (status === "running" && !["complete", "failed"].includes(r.status))) &&
    (mode === "all" || r.mode === mode) && (!text || r.query.toLowerCase().includes(text.toLowerCase()))), [rows, text, status, mode]);

  useHotkeys({
    j: () => setSel((s) => Math.min(list.length - 1, s + 1)),
    k: () => setSel((s) => Math.max(0, s - 1)),
    enter: () => list[sel] && router.push(`/research/${list[sel].id}`),
  });

  const seg = (value: string, set: (v: string) => void, opts: string[]) => (
    <div className="flex rounded border border-line p-0.5">
      {opts.map((o) => (
        <button key={o} onClick={() => { set(o); setSel(0); }} aria-pressed={value === o}
                className={`rounded-sm px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${value === o ? "bg-amber text-amber-ink" : "text-dim hover:text-fg"}`}>
          {o}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <input value={text} onChange={(e) => { setText(e.target.value); setSel(0); }} placeholder="search queries…" aria-label="Search runs" className="field h-8 max-w-72" />
        {seg(status, setStatus, ["all", "complete", "running", "failed"])}
        {seg(mode, setMode, ["all", "deep", "web", "company", "market"])}
        <span className="ml-auto hidden items-center gap-1 font-mono text-[10px] text-faint md:flex"><Kbd>j</Kbd><Kbd>k</Kbd> move <Kbd>↵</Kbd> open</span>
      </div>
      {!list.length ? <Empty title="No matching runs" /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left">
                {["Status", "Query", "Mode", "Sources", "Changes", "Duration", "When"].map((h, i) => (
                  <th key={h} className={`label py-2 ${i === 0 ? "pl-3" : ""} ${i > 2 ? "pr-3 text-right" : "pr-3"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => (
                <tr key={r.id} onClick={() => router.push(`/research/${r.id}`)} onMouseEnter={() => setSel(i)}
                    className={`cursor-pointer border-b border-line/60 last:border-0 ${i === sel ? "bg-hover" : ""}`}>
                  <td className="py-2 pr-3 pl-3"><Tag tone={STATUS_TONE[r.status] ?? "amber"}>{r.status}</Tag></td>
                  <td className="max-w-lg py-2 pr-3">
                    <a href={`/research/${r.id}`} onClick={(e) => e.stopPropagation()} className="line-clamp-1">
                      {i === sel && <span className="mr-1 font-mono text-amber">›</span>}{r.query}
                    </a>
                  </td>
                  <td className="py-2 pr-3 font-mono text-[11px] whitespace-nowrap text-dim uppercase">{r.mode}{r.playbook && r.playbook !== "brief" && <Tag tone="info" className="ml-1.5">{playbookLabel(r.playbook)}</Tag>}</td>
                  <td className="py-2 pr-3 text-right font-mono text-[12px]">{r.sources?.[0]?.count ?? 0}</td>
                  <td className="py-2 pr-3 text-right font-mono text-[12px]">{r.changes?.[0]?.count ?? 0}</td>
                  <td className="py-2 pr-3 text-right font-mono text-[12px] text-dim">{r.duration != null ? `${Math.round(r.duration)}s` : "-"}</td>
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
