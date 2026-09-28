"use client";

import { useEffect, useReducer } from "react";
import { streamEvents } from "@/lib/api";
import type { Change, Evidence, NodeName, Report, RunEvent, Source, Task } from "@/lib/types";

export type Step = {
  key: string; node: NodeName; iteration: number; startedAt: number; elapsed?: number;
  logs: { message: string; level?: "warn"; t: number; query?: string }[];
};

export type RunState = {
  t0: number | null; steps: Step[]; plan: Task[]; entities: { name: string; domain: string | null }[];
  sources: Source[]; evidence: Evidence[]; contradictions: string[]; changes: Change[]; report: Report | null;
  needsMore: number | null; reportId: string | null; error: string | null; done: boolean;
  models: { fast: string; strong: string } | null; decider: "jev" | "llm" | null;
};

const initial: RunState = {
  t0: null, steps: [], plan: [], entities: [], sources: [], evidence: [], contradictions: [], changes: [],
  report: null, needsMore: null, reportId: null, error: null, done: false, models: null, decider: null,
};

function reduce(s: RunState, e: RunEvent | "reset"): RunState {
  if (e === "reset") return initial;
  const t0 = s.t0 ?? e.t;
  switch (e.type) {
    case "node_start":
      return { ...s, t0, steps: [...s.steps, { key: `${e.node}-${s.steps.length}`, node: e.node, iteration: e.iteration, startedAt: e.t, logs: [] }] };
    case "log":
      return { ...s, t0, steps: s.steps.map((st, i) => (i === s.steps.length - 1 ? { ...st, logs: [...st.logs, { message: e.message, level: e.level, t: e.t, query: e.query }] } : st)) };
    case "node_end": {
      const u = e.update as Record<string, never>;
      const steps = s.steps.map((st, i) => (i === s.steps.length - 1 ? { ...st, elapsed: e.elapsed } : st));
      return {
        ...s, t0, steps,
        plan: u.research_plan ?? s.plan, entities: u.entities ?? s.entities, sources: u.sources ?? s.sources,
        evidence: u.evidence ?? s.evidence, contradictions: u.contradictions ?? s.contradictions,
        changes: u.changes ?? s.changes, report: u.report ?? s.report,
        needsMore: (u.decisions as { needs_more_research?: number } | undefined)?.needs_more_research ?? s.needsMore,
        models: u.models ?? s.models, decider: u.decider ?? s.decider,
      };
    }
    case "done":
      return { ...s, reportId: e.report_id, done: true };
    case "error":
      return { ...s, error: e.message, done: true };
  }
}

/** Folds the backend's SSE timeline (live or replayed) into view state. */
export function useRun(id: string) {
  const [state, dispatch] = useReducer(reduce, initial);
  useEffect(() => {
    const ctl = new AbortController();
    dispatch("reset");
    streamEvents(id, dispatch, ctl.signal).catch((err) => {
      if (!ctl.signal.aborted) dispatch({ t: Date.now() / 1000, type: "error", message: err.message ?? "Connection lost" });
    });
    return () => ctl.abort();
  }, [id]);
  return state;
}
