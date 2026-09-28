"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, BookmarkCheck, X } from "lucide-react";
import { createBrowserClient } from "@insforge/sdk/ssr";
import { Empty, Tag } from "@/components/term";
import { playbookLabel } from "@/lib/playbooks";
import { timeAgo } from "@/lib/format";

export type ReportRow = {
  id: string; run_id: string; title: string; saved: boolean; created_at: string;
  summary: { executive_summary?: string; highlights?: { value: string; label: string }[]; recommended_actions?: string[]; deliverable?: { playbook: string } };
};

const insforge = typeof window !== "undefined" ? createBrowserClient() : null;

export function ReportsTable({ rows: initial }: { rows: ReportRow[] }) {
  const [rows, setRows] = useState(initial);
  const [filter, setFilter] = useState<"saved" | "all">(initial.some((r) => r.saved) ? "saved" : "all");
  const [preview, setPreview] = useState<ReportRow | null>(null);
  const list = rows.filter((r) => filter === "all" || r.saved);

  async function toggle(r: ReportRow) {
    const next = !r.saved;
    setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, saved: next } : x)));
    const res = await insforge?.database.from("reports").update({ saved: next }).eq("id", r.id);
    if (res?.error) setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, saved: !next } : x)));
  }

  return (
    <div className="grid min-h-[60vh] lg:grid-cols-[1fr_420px]">
      <div className="min-w-0">
        <div className="flex items-center gap-1 border-b border-line px-3 py-2">
          {(["saved", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f}
                    className={`rounded-sm px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${filter === f ? "bg-amber text-amber-ink" : "text-dim hover:text-fg"}`}>
              {f} <span className="opacity-60">{f === "saved" ? rows.filter((r) => r.saved).length : rows.length}</span>
            </button>
          ))}
        </div>
        {!list.length ? <Empty title={filter === "saved" ? "Nothing saved yet" : "No reports yet"}>{filter === "saved" ? "Bookmark a brief to keep it here." : "Briefs appear when research completes."}</Empty> : (
          <ul className="divide-y divide-line/60">
            {list.map((r) => (
              <li key={r.id} onMouseEnter={() => setPreview(r)}
                  className={`flex items-center gap-3 px-3 py-2.5 ${preview?.id === r.id ? "bg-hover" : ""}`}>
                <button onClick={() => toggle(r)} aria-pressed={r.saved} aria-label={r.saved ? "Unsave" : "Save"} className="text-dim hover:text-amber">
                  {r.saved ? <BookmarkCheck className="size-4 text-amber" /> : <Bookmark className="size-4" />}
                </button>
                <Link href={`/research/${r.run_id}`} className="min-w-0 flex-1 truncate hover:text-amber" onFocus={() => setPreview(r)}>{r.title}</Link>
                {r.summary.deliverable && <Tag tone="info">{playbookLabel(r.summary.deliverable.playbook)}</Tag>}
                <span className="hidden gap-3 font-mono text-[11px] text-dim sm:flex">
                  {r.summary.highlights?.slice(0, 2).map((h, i) => <span key={i} className="text-amber">{h.value}</span>)}
                </span>
                <span className="w-24 text-right font-mono text-[11px] text-faint">{timeAgo(r.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <aside className={`${preview ? "fixed inset-x-3 bottom-16 z-30 max-h-[60vh] overflow-y-auto rounded border shadow-2xl" : "hidden"} border-line-2 bg-panel-2 p-4 lg:static lg:block lg:max-h-none lg:rounded-none lg:border-0 lg:border-l lg:shadow-none`}>
        {preview ? (
          <div>
            <div className="flex items-start gap-2">
              <p className="label">preview</p>
              <button onClick={() => setPreview(null)} className="ml-auto text-dim lg:hidden" aria-label="Close preview"><X className="size-4" /></button>
            </div>
            <h3 className="mt-2 font-semibold">{preview.title}</h3>
            {!!preview.summary.highlights?.length && (
              <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line">
                {preview.summary.highlights.slice(0, 4).map((h, i) => (
                  <div key={i} className="bg-panel px-3 py-2">
                    <p className="font-mono text-lg font-semibold text-amber">{h.value}</p>
                    <p className="label truncate">{h.label}</p>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-3 text-[13.5px] leading-relaxed">{preview.summary.executive_summary}</p>
            {!!preview.summary.recommended_actions?.length && (
              <ol className="mt-3 space-y-1 text-[13px] text-dim">
                {preview.summary.recommended_actions.map((a, i) => <li key={i}><span className="font-mono text-up">{i + 1}.</span> {a}</li>)}
              </ol>
            )}
            <Link href={`/research/${preview.run_id}`} className="btn-amber mt-4">Open brief →</Link>
          </div>
        ) : <p className="font-mono text-[12px] text-faint">{"// "}hover a report to preview</p>}
      </aside>
    </div>
  );
}
