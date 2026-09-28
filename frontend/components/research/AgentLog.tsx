"use client";

import { useEffect, useRef } from "react";
import type { NodeName } from "@/lib/types";
import type { RunState, Step } from "./useRun";

const CODE: Record<NodeName, { tag: string; color: string; running: string }> = {
  planner: { tag: "PLAN", color: "text-violet", running: "planning research" },
  researcher: { tag: "WEB ", color: "text-info", running: "searching and crawling" },
  evidence_analyst: { tag: "EVID", color: "text-amber", running: "extracting claims" },
  decision_engine: { tag: "JEV ", color: "text-up", running: "scoring decisions" },
  synthesizer: { tag: "SYNT", color: "text-violet", running: "writing brief" },
};

const clock = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

type Line = { key: string; t: string; tag: string; color: string; text: React.ReactNode; state: "ok" | "warn" | "run" | "info" };

function linesFor(step: Step, run: RunState, last: boolean): Line[] {
  const c = CODE[step.node];
  const t = (abs: number) => clock(Math.max(0, abs - (run.t0 ?? abs)));
  const base = { tag: c.tag, color: c.color };
  const running = step.elapsed == null && last && !run.done;
  const out: Line[] = [];

  if (step.node === "researcher") {
    const searches = step.logs.filter((l) => l.message.startsWith("Searching:"));
    for (const [i, s] of searches.entries()) {
      const r = step.logs.find((l) => l.query === s.query && !l.message.startsWith("Searching:"));
      out.push({ ...base, key: `${step.key}-s${i}`, t: t(r?.t ?? s.t), state: r ? (r.level === "warn" ? "warn" : "ok") : "run",
        text: <><span className="text-fg">{s.query}</span>{r && <span className="text-faint"> — {r.message}</span>}</> });
    }
    for (const [i, l] of step.logs.entries()) {
      if (!l.query && l.level === "warn") out.push({ ...base, key: `${step.key}-w${i}`, t: t(l.t), state: "warn", text: <span className="text-amber">{l.message}</span> });
    }
    out.sort((a, b) => (a.state === "run" ? 1 : 0) - (b.state === "run" ? 1 : 0) || a.t.localeCompare(b.t));
  } else if (step.node === "planner" && step.elapsed != null) {
    for (const [i, l] of step.logs.entries()) {
      if (l.message.startsWith("LLM")) out.push({ ...base, key: `${step.key}-m${i}`, t: t(l.t), state: "info", text: <span className="text-violet">{l.message}</span> });
      else if (l.level === "warn") out.push({ ...base, key: `${step.key}-w${i}`, t: t(l.t), state: "warn", text: <span className="text-amber">{l.message}</span> });
    }
    out.push({ ...base, key: `${step.key}-p`, t: t(step.startedAt + step.elapsed), state: "ok", text: <span className="text-fg">plan ready · {run.plan.length} tasks</span> });
    for (const [i, task] of run.plan.entries()) {
      out.push({ ...base, key: `${step.key}-t${i}`, t: "", state: "info", text: <><span className="text-faint">{String(i + 1).padStart(2, "0")}</span> <span className="uppercase text-dim">{task.topic}</span> {task.query}</> });
    }
  } else {
    for (const [i, l] of step.logs.entries()) {
      out.push({ ...base, key: `${step.key}-l${i}`, t: t(l.t), state: l.level === "warn" ? "warn" : "ok", text: <span className="text-fg">{l.message}</span> });
    }
  }
  if (running) out.push({ ...base, key: `${step.key}-run`, t: t(step.startedAt), state: "run", text: <span className="cursor text-dim">{c.running}</span> });
  else if (step.elapsed != null && step.node !== "planner") {
    out.push({ ...base, key: `${step.key}-done`, t: t(step.startedAt + step.elapsed), state: "ok", text: <span className="text-faint">done in {step.elapsed}s</span> });
  }
  return out;
}

const GLYPH = { ok: <span className="text-up">✓</span>, warn: <span className="text-amber">!</span>, run: <span className="text-info">◐</span>, info: <span className="text-faint">·</span> };

export function AgentLog({ run }: { run: RunState }) {
  const end = useRef<HTMLDivElement>(null);
  const count = run.steps.reduce((n, s) => n + s.logs.length, run.steps.length);
  useEffect(() => {
    if (!run.done) end.current?.scrollIntoView({ block: "nearest" });
  }, [count, run.done]);

  return (
    <div className="font-mono text-[11.5px] leading-[1.7]" role="log" aria-live="polite" aria-label="Agent log">
      <p className="px-3 pt-3 text-faint">$ mkt-intel research --stream</p>
      {!run.steps.length && !run.error && <p className="cursor px-3 text-dim">connecting to agents</p>}
      {run.steps.map((st, i) => (
        <div key={st.key}>
          {st.node === "researcher" && st.iteration > 0 && (
            <p className="px-3 py-1 text-amber">── LOOP {st.iteration + 1} · following up on gaps flagged by Jev ──</p>
          )}
          {linesFor(st, run, i === run.steps.length - 1).map((l) => (
            <div key={l.key} className="grid grid-cols-[42px_36px_14px_1fr] gap-x-1.5 px-3 hover:bg-hover">
              <span className="text-faint tabular-nums">{l.t}</span>
              <span className={`font-semibold ${l.color}`}>{l.tag}</span>
              {GLYPH[l.state]}
              <span className="min-w-0 break-words text-dim">{l.text}</span>
            </div>
          ))}
        </div>
      ))}
      {run.error && <p className="mx-3 my-2 border-l-2 border-down pl-2 text-down">ERR {run.error}</p>}
      {run.done && !run.error && <p className="px-3 py-2 text-up">✓ brief ready</p>}
      <div ref={end} className="h-3" />
    </div>
  );
}
