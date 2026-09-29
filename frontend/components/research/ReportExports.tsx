"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2, Presentation } from "lucide-react";
import type { Change, Report, Source } from "@/lib/types";

export function save(name: string, blob: Blob) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "report";

/** Every download for a finished report. PPTX and XLSX builders load on click, so they cost nothing until used. */
export function ReportExports({ id, report, changes, sources }: { id?: string; report: Report; changes: Change[]; sources: Source[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const base = slug(report.title);
  const btn = "inline-flex h-7 items-center gap-1.5 rounded-sm border border-line-2 px-2 font-mono text-[11px] text-dim transition hover:border-amber hover:text-amber disabled:opacity-50";

  async function run(kind: "pptx" | "xlsx") {
    setBusy(kind);
    setError(null);
    try {
      const mod = kind === "pptx" ? await import("@/lib/exports/pptx") : await import("@/lib/exports/xlsx");
      save(`${base}.${kind}`, await mod.build(report, changes, sources));
    } catch (e) {
      setError(`Could not build the ${kind === "pptx" ? "slide deck" : "workbook"}: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setBusy(null);
    }
  }

  const d = report.deliverable;
  return (
    <div data-print-hide>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="label mr-1">download</span>
        {id && <a href={`/report/${id}?print=1`} target="_blank" rel="noreferrer" className={btn}><FileText className="size-3" /> PDF</a>}
        <button className={btn} disabled={!!busy} onClick={() => run("pptx")}>
          {busy === "pptx" ? <Loader2 className="size-3 animate-spin" /> : <Presentation className="size-3" />} Slides
        </button>
        <button className={btn} disabled={!!busy} onClick={() => run("xlsx")}>
          {busy === "xlsx" ? <Loader2 className="size-3 animate-spin" /> : <FileSpreadsheet className="size-3" />} Excel
        </button>
        <button className={btn} onClick={() => save(`${base}.md`, new Blob([report.markdown], { type: "text/markdown" }))}><Download className="size-3" /> Markdown</button>
        <button className={btn} onClick={() => save(`${base}-data.json`, new Blob([JSON.stringify({ report: { ...report, markdown: undefined }, changes }, null, 2)], { type: "application/json" }))}>
          <Download className="size-3" /> JSON
        </button>
        {d?.files && d.files.length > 1 && d.files.map((f) => (
          <button key={f.name} className={btn} onClick={() => save(f.name, new Blob([f.markdown], { type: "text/markdown" }))}><Download className="size-3" /> {f.name}</button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 font-mono text-[12px] text-down">{error}</p>}
    </div>
  );
}
