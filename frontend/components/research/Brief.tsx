"use client";

import { Blocks, ImpactTag, StatTile, Tag } from "@/components/term";
import type { Change } from "@/lib/types";
import type { RunState } from "./useRun";

const TILE_TONES = ["amber", "info", "up", "violet"] as const;

export function Brief({ run, createdAt }: { run: RunState; createdAt: string }) {
  const r = run.report;
  if (!r) {
    return (
      <div className="space-y-4 p-4 md:p-6" aria-busy>
        <p className="font-mono text-[12px] text-dim">
          {run.error ? <span className="text-down">ERR run stopped before a brief was written</span> : <span className="cursor">agents are verifying evidence; the brief compiles here</span>}
        </p>
        {!run.error && (
          <>
            <div className="scan h-8 w-3/4 rounded" />
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line md:grid-cols-4">
              {[0, 1, 2, 3].map((i) => <div key={i} className="scan h-20" />)}
            </div>
            <div className="scan h-24 rounded" />
            <div className="scan h-40 rounded" />
          </>
        )}
      </div>
    );
  }
  const verified = run.sources.filter((s) => s.crawled).length || run.sources.length;
  const real = run.changes.filter((c) => c.is_real_change).length;

  return (
    <article className="p-4 md:p-6">
      <p className="label">
        brief · {new Date(createdAt).toLocaleDateString(undefined, { dateStyle: "medium" })} · {verified} sources · {run.evidence.length} claims · {real}/{run.changes.length} changes verified
      </p>
      {(run.models || run.decider) && (
        <p className="mt-1 font-mono text-[10px] text-faint">
          {run.models && <>MODEL {run.models.strong}</>}
          {run.decider && <> · DECISIONS {run.decider === "jev" ? "Jev" : "LLM decision agent"}</>}
        </p>
      )}
      <h1 className="mt-2 text-2xl leading-tight font-semibold tracking-tight md:text-[30px]">{r.title}</h1>

      {r.highlights.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line md:grid-cols-4">
          {r.highlights.slice(0, 4).map((h, i) => (
            <div key={i} className="bg-panel"><StatTile value={h.value} label={h.label} sub={h.caption} tone={TILE_TONES[i]} /></div>
          ))}
        </div>
      )}

      <section className="mt-5 border-l-2 border-amber pl-4">
        <p className="label text-amber">executive summary</p>
        <p className="prose-brief mt-1.5 text-[15px] text-fg">{r.executive_summary}</p>
      </section>

      <section className="mt-7">
        <p className="label">key changes</p>
        <ol className="mt-2 divide-y divide-line rounded border border-line">
          {r.key_changes.map((k, i) => {
            const c: Change | undefined = run.changes[k.change_index];
            return (
              <li key={i} className="grid grid-cols-[28px_1fr] gap-3 p-4">
                <span className="font-mono text-[13px] font-semibold text-amber">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{k.headline}</h3>
                    <span className="ml-auto flex items-center gap-1.5">
                      {c?.change_type && <Tag>{c.change_type}</Tag>}
                      {c && !c.is_real_change && <Tag tone="amber">unverified</Tag>}
                      <ImpactTag score={c?.impact_score} />
                    </span>
                  </div>
                  {c && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-faint">
                      <span className="flex items-center gap-1.5">IMPACT <Blocks value={c.impact_score ?? 0} /></span>
                      <span className="flex items-center gap-1.5">CONF <Blocks value={c.confidence ?? 0} tone="up" /> {c.confidence}%</span>
                      {c.company && <span>{c.company.toUpperCase()}</span>}
                      {c.published_at && <span>{c.published_at}</span>}
                    </div>
                  )}
                  <ul className="mt-2.5 space-y-1 text-[13.5px] text-fg/90">
                    {k.bullets.map((b, j) => <li key={j} className="flex gap-2"><span className="text-faint">›</span><span>{b}</span></li>)}
                  </ul>
                  {k.quote && (
                    <blockquote className="mt-3 rounded-sm bg-panel-2 px-3 py-2 font-mono text-[12px] text-dim">
                      <span className="text-amber">“</span>{k.quote}<span className="text-amber">”</span>
                      {k.quote_source && <span className="text-faint"> — {k.quote_source}</span>}
                    </blockquote>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-7 grid gap-3 md:grid-cols-2">
        <div className="rounded border border-line p-4">
          <p className="label">why it matters</p>
          <p className="prose-brief mt-2 text-[13.5px]">{r.why_it_matters}</p>
        </div>
        <div className="rounded border border-line p-4">
          <p className="label">recommended actions</p>
          <ol className="mt-2 space-y-1.5 text-[13.5px]">
            {r.recommended_actions.map((a, i) => (
              <li key={i} className="flex gap-2"><span className="font-mono text-[12px] text-up">{i + 1}.</span><span>{a}</span></li>
            ))}
          </ol>
        </div>
      </section>
    </article>
  );
}
