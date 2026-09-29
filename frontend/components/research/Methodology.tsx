import { AlertTriangle } from "lucide-react";
import { qualityTier, sourceQuality } from "@/lib/quality";
import type { Methodology as M, Source } from "@/lib/types";

const PROVIDER: Record<string, string> = { context: "Context.dev", tavily: "Tavily", firecrawl: "Firecrawl" };

/** How the research was done: counts, completeness per topic, named gaps, source quality mix and contradictions. */
export function Methodology({ m, sources }: { m: M; sources: Source[] }) {
  const tiers = { high: 0, medium: 0, low: 0 };
  for (const s of sources) tiers[qualityTier(sourceQuality(s, m))]++;
  const stats: [string, string][] = [
    ["sources read", `${m.sources_read} of ${m.sources_found}`], ["claims", String(m.claims)],
    ["verified findings", `${m.verified} of ${m.findings}`], ["contradictions", String(m.contradictions.length)],
    ["research rounds", String(m.rounds)],
    ["providers", Object.keys(m.providers).map((p) => PROVIDER[p] ?? p).join(", ") || "-"],
  ];
  return (
    <section className="rounded border border-line" aria-label="Research methodology">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-t bg-line sm:grid-cols-3 lg:grid-cols-6">
        {stats.map(([k, v]) => (
          <div key={k} className="bg-panel px-3 py-2"><dt className="label">{k}</dt><dd className="mt-0.5 font-mono text-[13px]">{v}</dd></div>
        ))}
      </dl>
      <div className="grid gap-5 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <div className="flex items-baseline justify-between">
            <p className="label">research completeness</p>
            <p className="font-mono text-lg font-semibold text-amber">{m.completeness}%</p>
          </div>
          <ul className="mt-2 space-y-1.5">
            {m.coverage.map((c) => (
              <li key={c.label} className="grid grid-cols-[minmax(0,1fr)_120px_52px] items-center gap-2 text-[12.5px]">
                <span className="truncate">{c.label}</span>
                <span className="h-2 rounded-[2px]" style={{ width: `${Math.max(3, c.pct)}%`, background: c.pct >= 67 ? "var(--up)" : c.pct >= 34 ? "var(--amber)" : "var(--down)" }} />
                <span className="text-right font-mono text-[11px] text-dim">{c.sources} src</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-dim">
            Source quality: <span className="text-up">{tiers.high} high</span>, <span className="text-amber">{tiers.medium} medium</span>, <span className="text-down">{tiers.low} low</span>
            {m.avg_reliability != null && <> · claim reliability {Math.round(m.avg_reliability * 100)}%</>}
          </p>
        </div>
        <div>
          <p className="label">research gaps</p>
          {m.gaps.length ? (
            <ul className="mt-2 space-y-1 text-[13px]">{m.gaps.map((g) => <li key={g} className="flex gap-2"><span className="font-mono text-amber">?</span>{g}</li>)}</ul>
          ) : <p className="mt-2 text-[13px] text-dim">No open gaps: every planned topic has sources.</p>}
        </div>
      </div>
      {m.contradictions.length > 0 && (
        <div className="border-t border-line p-4">
          <p className="label text-down">contradictions between sources</p>
          <ul className="mt-2 grid gap-2 md:grid-cols-2">
            {m.contradictions.map((c) => (
              <li key={c} className="flex gap-2 rounded-sm border border-down/30 bg-down-soft px-3 py-2 text-[13px]">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-down" aria-hidden />{c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
