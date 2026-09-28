"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { ActionTag, Blocks, Empty, Favicon, ImpactTag, Tag } from "@/components/term";
import { domain } from "@/lib/format";
import type { Change } from "@/lib/types";
import type { RunState } from "./useRun";

const TABS = ["sources", "evidence", "jev"] as const;
type TabId = (typeof TABS)[number];
const PROVIDER = { context: "CTX", tavily: "TAVILY", firecrawl: "FIRECRAWL" };

export function Inspector({ run }: { run: RunState }) {
  const [tab, setTab] = useState<TabId>("sources");
  const count = { sources: run.sources.length, evidence: run.evidence.length, jev: run.changes.length };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Inspector" className="flex h-9 shrink-0 border-b border-line">
        {TABS.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
                  className={`flex-1 border-b-2 font-mono text-[10px] font-semibold tracking-[0.14em] uppercase transition ${
                    tab === t ? "border-amber text-amber" : "border-transparent text-dim hover:text-fg"}`}>
            {t} <span className="text-faint">{count[t]}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto">
        {tab === "sources" && <Sources run={run} />}
        {tab === "evidence" && <EvidenceList run={run} />}
        {tab === "jev" && (
          <>
            {run.decider && (
              <p className="border-b border-line px-3 py-2 font-mono text-[10px] text-dim">
                ENGINE <span className={run.decider === "jev" ? "text-up" : "text-amber"}>{run.decider === "jev" ? "JEV · typed decision model" : "LLM DECISION AGENT · same checks, your LLM key"}</span>
              </p>
            )}
            <JevList changes={run.changes} />
          </>
        )}
      </div>
    </div>
  );
}

function Sources({ run }: { run: RunState }) {
  if (!run.sources.length) return <Empty title="No sources yet">Appears as the research agent searches.</Empty>;
  return (
    <ul className="divide-y divide-line/60">
      {run.sources.map((s) => (
        <li key={s.url}>
          <a href={s.url} target="_blank" rel="noreferrer" className="group block px-3 py-2.5 hover:bg-hover">
            <div className="flex items-center gap-2">
              <Favicon url={s.url} />
              <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-dim">{domain(s.url)}</span>
              <ExternalLink className="size-3 text-faint opacity-0 group-hover:opacity-100" />
            </div>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug group-hover:text-amber">{s.title || s.url}</p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <Tag>{s.type}</Tag>
              {s.crawled && <Tag tone="up">crawled</Tag>}
              {s.relevance === "high" && <Tag tone="amber">high rel</Tag>}
              {s.provider && <Tag tone="violet">{PROVIDER[s.provider]}</Tag>}
            </div>
          </a>
        </li>
      ))}
    </ul>
  );
}

function EvidenceList({ run }: { run: RunState }) {
  if (!run.evidence.length) return <Empty title="No evidence yet">Claims are extracted once sources are crawled.</Empty>;
  return (
    <div>
      {run.contradictions.length > 0 && (
        <div className="border-b border-down/30 bg-down-soft px-3 py-2.5">
          <p className="label text-down">contradictions · {run.contradictions.length}</p>
          <ul className="mt-1 space-y-1 text-[12.5px]">{run.contradictions.map((c, i) => <li key={i}>› {c}</li>)}</ul>
        </div>
      )}
      <ul className="divide-y divide-line/60">
        {run.evidence.map((e, i) => {
          const rel = Math.round(e.reliability * 100);
          return (
            <li key={i} className="px-3 py-2.5">
              <p className="text-[13px] leading-snug">{e.claim}</p>
              {e.excerpt && <p className="mt-1 border-l border-line-2 pl-2 font-mono text-[11px] text-dim">“{e.excerpt}”</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px] text-faint">
                <Tag tone="violet">{e.entity}</Tag>
                <Tag>{e.topic}</Tag>
                <span className="flex items-center gap-1">REL <Blocks value={rel} n={6} tone={rel >= 70 ? "up" : rel >= 40 ? "amber" : "down"} label="reliability" /> {rel}</span>
                {e.source_url && (
                  <a href={e.source_url} target="_blank" rel="noreferrer" className="ml-auto flex items-center gap-1 hover:text-amber">
                    <Favicon url={e.source_url} size={11} />{domain(e.source_url)}
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function JevList({ changes }: { changes: Change[] }) {
  if (!changes.length) return <Empty title="No decisions yet">Jev scores each detected change.</Empty>;
  return (
    <ul className="divide-y divide-line/60">
      {changes.map((c, i) => {
        const ct = c.decision?.change_type;
        const probs = ct?.type === "choice" ? Object.entries(ct.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 4) : [];
        return (
          <li key={i} className="px-3 py-3">
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug">{c.title}</p>
              <ActionTag action={c.recommended_action} />
            </div>
            <dl className="mt-2 grid grid-cols-[92px_1fr_auto] items-center gap-x-2 gap-y-1.5 font-mono text-[10px]">
              <dt className="text-faint">REAL CHANGE</dt>
              <dd><Blocks value={c.confidence ?? 0} tone={c.is_real_change ? "up" : "amber"} label="confidence" /></dd>
              <dd className={c.is_real_change ? "text-up" : "text-amber"}>{c.is_real_change ? "YES" : "UNVER"} {c.confidence}%</dd>
              <dt className="text-faint">IMPACT</dt>
              <dd><Blocks value={c.impact_score ?? 0} /></dd>
              <dd><ImpactTag score={c.impact_score} /></dd>
              <dt className="text-faint">EVIDENCE</dt>
              <dd><Blocks value={c.evidence_quality ?? 0} tone="violet" label="evidence quality" /></dd>
              <dd className="text-dim">{c.evidence_quality}</dd>
              <dt className="text-faint">AFFECTED</dt>
              <dd className="col-span-2 text-fg uppercase">{c.affected ?? "—"}</dd>
            </dl>
            {probs.length > 0 && (
              <div className="mt-2.5 space-y-1">
                <p className="label">change type · p</p>
                {probs.map(([k, p]) => (
                  <div key={k} className="grid grid-cols-[92px_1fr_36px] items-center gap-2 font-mono text-[10px]">
                    <span className={`uppercase ${k === c.change_type ? "text-amber" : "text-dim"}`}>{k}</span>
                    <span className="h-1.5 overflow-hidden rounded-sm bg-line-2">
                      <span className={`block h-full ${k === c.change_type ? "bg-amber" : "bg-faint"}`} style={{ width: `${p * 100}%` }} />
                    </span>
                    <span className="text-right text-dim">{Math.round(p * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
