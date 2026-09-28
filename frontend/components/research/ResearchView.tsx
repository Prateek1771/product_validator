"use client";

import { useState } from "react";
import { Bookmark, BookmarkCheck, Check, Download, Link2, Printer } from "lucide-react";
import { createBrowserClient } from "@insforge/sdk/ssr";
import { Tag } from "@/components/term";
import { AgentLog } from "./AgentLog";
import { Brief } from "./Brief";
import { Inspector } from "./Inspector";
import { useRun, type RunState } from "./useRun";

const insforge = typeof window !== "undefined" ? createBrowserClient() : null;
const PANES = ["log", "brief", "inspect"] as const;

export function ResearchView({ id, query, mode, createdAt, savedInitially }: {
  id: string; query: string; mode: string; createdAt: string; savedInitially: boolean;
}) {
  const run = useRun(id);
  return <ResearchLayout run={run} query={query} mode={mode} createdAt={createdAt} savedInitially={savedInitially} />;
}

/** Pure layout, so it can also render fixture state. */
export function ResearchLayout({ run, query, mode, createdAt, savedInitially }: {
  run: RunState; query: string; mode: string; createdAt: string; savedInitially: boolean;
}) {
  const [saved, setSaved] = useState(savedInitially);
  const [copied, setCopied] = useState(false);
  const [pane, setPane] = useState<(typeof PANES)[number]>("brief");
  const status = run.error ? "failed" : run.done ? "complete" : run.steps.length ? "running" : "queued";
  const elapsed = run.steps.length && run.t0 != null
    ? Math.round(run.steps.at(-1)!.startedAt + (run.steps.at(-1)!.elapsed ?? 0) - run.t0) : 0;

  async function toggleSave() {
    if (!run.reportId || !insforge) return;
    setSaved(!saved);
    const { error } = await insforge.database.from("reports").update({ saved: !saved }).eq("id", run.reportId);
    if (error) setSaved(saved);
  }
  function exportMd() {
    if (!run.report) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([run.report.markdown], { type: "text/markdown" }));
    a.download = `${run.report.title.replace(/[^\w]+/g, "-").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function share() {
    await navigator.clipboard.writeText(location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const paneCls = (p: (typeof PANES)[number]) => (pane === p ? "flex" : "hidden") + " lg:flex";

  return (
    <div className="flex h-[calc(100vh-76px)] flex-col max-md:h-[calc(100vh-76px-56px)]">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line bg-panel px-3 py-2" data-print-hide>
        <Tag tone={status === "complete" ? "up" : status === "failed" ? "down" : "amber"}>
          {status === "running" && <span className="live-dot size-1.5 rounded-full bg-amber" />}{status}
        </Tag>
        <Tag>{mode}</Tag>
        <p className="min-w-0 flex-1 truncate font-mono text-[12px] max-sm:order-last max-sm:basis-full"><span className="text-amber">&gt;</span> {query}</p>
        <span className="font-mono text-[11px] text-faint tabular-nums">T+{elapsed}s</span>
        <div className="flex gap-1">
          <button onClick={toggleSave} disabled={!run.reportId} className="btn" aria-pressed={saved} title="Save report">
            {saved ? <BookmarkCheck className="size-3.5 text-amber" /> : <Bookmark className="size-3.5" />}<span className="hidden xl:inline">{saved ? "saved" : "save"}</span>
          </button>
          <button onClick={share} className="btn" title="Copy link">{copied ? <Check className="size-3.5 text-up" /> : <Link2 className="size-3.5" />}<span className="hidden xl:inline">link</span></button>
          <button onClick={exportMd} disabled={!run.report} className="btn" title="Export Markdown"><Download className="size-3.5" /><span className="hidden xl:inline">.md</span></button>
          <button onClick={() => print()} disabled={!run.report} className="btn w-8 px-0" aria-label="Print or save as PDF"><Printer className="size-3.5" /></button>
        </div>
      </div>

      <div role="tablist" aria-label="Panes" className="flex shrink-0 border-b border-line lg:hidden" data-print-hide>
        {PANES.map((p) => (
          <button key={p} role="tab" aria-selected={pane === p} onClick={() => setPane(p)}
                  className={`flex-1 border-b-2 py-2 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase ${pane === p ? "border-amber text-amber" : "border-transparent text-dim"}`}>
            {p === "log" ? "agents" : p === "inspect" ? "inspector" : p}
          </button>
        ))}
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(300px,360px)_1fr_minmax(300px,360px)]">
        <aside className={`${paneCls("log")} min-h-0 flex-col overflow-y-auto border-r border-line bg-panel`} data-print-hide>
          <p className="label sticky top-0 z-10 border-b border-line bg-panel px-3 py-2.5 text-fg">agent log</p>
          <AgentLog run={run} />
        </aside>
        <section className={`${paneCls("brief")} min-h-0 flex-col overflow-y-auto`}>
          <Brief run={run} createdAt={createdAt} />
        </section>
        <aside className={`${paneCls("inspect")} min-h-0 flex-col border-l border-line bg-panel`} data-print-hide>
          <Inspector run={run} />
        </aside>
      </div>
    </div>
  );
}
