"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { creditPct } from "@/components/SystemMini";
import { Blocks, Empty, PageTitle, Panel, STATUS_TONE, StatTile, Tag } from "@/components/term";
import { getSystem } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { ProviderStatus, SystemStatus } from "@/lib/types";

const ST = {
  ok: { label: "operational", tone: "up", dot: "bg-up" },
  exhausted: { label: "no credits", tone: "down", dot: "bg-down" },
  erroring: { label: "errors", tone: "amber", dot: "bg-amber" },
  not_configured: { label: "no key", tone: "dim", dot: "bg-faint" },
} as const;
const NAME: Record<string, string> = { context: "Context.dev", tavily: "Tavily", firecrawl: "Firecrawl" };
const uptime = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}h${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}m` : `${Math.floor(s / 60)}m${String(s % 60).padStart(2, "0")}s`);

export function SystemView() {
  const [data, setData] = useState<SystemStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    () => getSystem()
      .then((d) => { setData(d); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "Backend unreachable"))
      .finally(() => setLoading(false)),
    [],
  );
  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="mx-auto max-w-[1400px] space-y-3 p-3 md:p-4">
      <PageTitle title="System" sub="Provider health, credits and routing. Updates every 15 seconds.">
        <button onClick={() => { setLoading(true); load(); }} className="btn" disabled={loading}>
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> refresh
        </button>
      </PageTitle>
      {error && <p role="alert" className="rounded border border-down/40 bg-down-soft px-3 py-2 font-mono text-[12px] text-down">ERR {error}</p>}

      {!data ? (
        <div className="grid gap-3 md:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="scan h-40 rounded" />)}</div>
      ) : (
        <>
          <div className="panel grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
            <StatTile value={String(data.active_runs)} label="active runs" tone={data.active_runs ? "amber" : "dim"} />
            <StatTile value={uptime(data.uptime)} label="api uptime" tone="info" />
            <StatTile value={data.active_provider ? NAME[data.active_provider] : "NONE"} label="active web provider" tone={data.active_provider ? "up" : "down"} />
            <StatTile value={data.langsmith ? "ON" : "OFF"} label="langsmith tracing" sub={data.langsmith ? undefined : "set LANGSMITH_TRACING=true"} tone={data.langsmith ? "up" : "dim"} />
          </div>

          <Panel title="Search routing" bodyClassName="px-3 py-4">
            <ol className="flex flex-wrap items-center gap-2 font-mono text-[12px]">
              {data.search_chain.map((p, i) => {
                const st = data.providers.find((x) => x.id === p)?.status ?? "ok";
                const active = data.active_provider === p;
                const dead = st === "exhausted" || st === "not_configured";
                return (
                  <li key={p} className="flex items-center gap-2">
                    {i > 0 && <span className="text-faint">──▶</span>}
                    <span className={`flex items-center gap-2 rounded border px-3 py-1.5 ${active ? "border-amber bg-amber-soft text-amber" : dead ? "border-line text-faint line-through" : "border-line-2"}`}>
                      <span className={`size-1.5 rounded-full ${ST[st].dot}`} />{NAME[p]}{active && <span className="text-[9px] font-bold">ACTIVE</span>}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 font-mono text-[11px] text-faint">{"// "}each call walks the chain; a provider out of credits or with a rejected key is skipped for 1h</p>
          </Panel>

          <div className="grid gap-3 md:grid-cols-2">{data.providers.map((p) => <ProviderPanel key={p.id} p={p} />)}</div>

          <Panel title="LLM gateway" actions={<span className="font-mono text-[10px] text-dim">DEFAULT {data.llm.default}</span>}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13px]">
                <thead><tr className="border-b border-line text-left">
                  {["Provider", "Platform key", "Calls", "Your-key calls", "Tokens", "Failures"].map((h, i) => <th key={h} className={`label py-2 pr-3 ${i === 0 ? "pl-3" : "text-right"}`}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {data.llm.providers.map((p) => (
                    <tr key={p.id} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-3 pl-3 font-mono text-[12px] font-semibold uppercase">{p.name}</td>
                      <td className="py-2 pr-3 text-right">{p.platform ? <Tag tone="info">yes</Tag> : <Tag>byok only</Tag>}</td>
                      <td className="py-2 pr-3 text-right font-mono">{p.calls}</td>
                      <td className="py-2 pr-3 text-right font-mono text-up">{p.byok}</td>
                      <td className="py-2 pr-3 text-right font-mono text-dim">{p.tokens.toLocaleString("en-US")}</td>
                      <td className={`py-2 pr-3 text-right font-mono ${p.failures ? "text-down" : "text-faint"}`}>{p.failures}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="border-t border-line px-3 py-2 font-mono text-[10px] text-faint">
              DECISIONS jev {data.decisions.jev} · llm agent {data.decisions.llm}
            </p>
          </Panel>

          <Panel title="Recent runs" count={data.runs.length}>
            {!data.runs.length ? <Empty title="No runs yet" /> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-[13px]">
                  <thead><tr className="border-b border-line text-left">
                    {["Status", "Query", "Duration", "Provider calls", "When"].map((h, i) => <th key={h} className={`label py-2 pr-3 ${i === 0 ? "pl-3" : ""}`}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.runs.map((r) => (
                      <tr key={r.id} className="border-b border-line/60 last:border-0 hover:bg-hover">
                        <td className="py-2 pr-3 pl-3"><Tag tone={STATUS_TONE[r.status] ?? "amber"}>{r.status}</Tag></td>
                        <td className="max-w-sm py-2 pr-3"><Link href={`/research/${r.id}`} className="line-clamp-1 hover:text-amber">{r.query}</Link></td>
                        <td className="py-2 pr-3 font-mono text-[12px] text-dim">{r.duration != null ? `${r.duration}s` : "-"}</td>
                        <td className="py-2 pr-3"><Usage usage={r.usage} /></td>
                        <td className="py-2 pr-3 font-mono text-[11px] text-faint">{timeAgo(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function ProviderPanel({ p }: { p: ProviderStatus }) {
  const st = ST[p.status];
  const c = p.credits;
  const pct = creditPct(p);
  const credit = c?.remaining_usd != null ? `$${c.remaining_usd.toFixed(2)} / $${c.total_usd}`
    : c?.remaining != null ? `${c.remaining.toLocaleString("en-US")}${c.total ? ` / ${c.total.toLocaleString("en-US")}` : ""}`
    : c?.used != null ? `${c.used.toLocaleString("en-US")} used${c.total ? ` / ${c.total.toLocaleString("en-US")}` : ""}` : null;
  const meters = [["SEARCH", p.search], ["SCRAPE", p.scrape], ["DECIDE", p.decide]].filter((m): m is [string, NonNullable<ProviderStatus["search"]>] => !!m[1]);

  return (
    <Panel title={p.name} actions={<Tag tone={st.tone}><span className={`size-1.5 rounded-full ${st.dot}`} />{st.label}</Tag>} bodyClassName="p-3">
      <p className="label">{p.role}</p>
      <div className="mt-3 flex items-center gap-3">
        <span className="label w-16">credits</span>
        {pct != null ? <Blocks value={pct} n={20} tone={pct < 15 ? "down" : pct < 40 ? "amber" : "up"} label="credits remaining" /> : <span className="font-mono text-[11px] text-faint">-</span>}
        <span className="ml-auto font-mono text-[12px]">{credit ?? (p.status === "not_configured" ? "-" : "after first call")}</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded border border-line bg-line font-mono">
        {meters.map(([label, m]) => (
          <div key={label} className="bg-panel px-3 py-2">
            <p className="text-[9px] tracking-widest text-faint">{label}</p>
            <p className="text-lg font-semibold">{m.calls}</p>
            <p className="text-[10px] text-faint">
              <span className={m.failures ? "text-down" : ""}>{m.failures} fail</span>{m.fallbacks ? <span className="text-amber"> · {m.fallbacks} fb</span> : null}
            </p>
          </div>
        ))}
        {p.cost_usd != null && (
          <div className="bg-panel px-3 py-2">
            <p className="text-[9px] tracking-widest text-faint">SPEND</p>
            <p className="text-lg font-semibold">${p.cost_usd.toFixed(4)}</p>
            <p className="text-[10px] text-faint">since restart</p>
          </div>
        )}
      </div>
      {p.exhausted_until && <p className="mt-2 font-mono text-[11px] text-down">skipped until {new Date(p.exhausted_until * 1000).toLocaleTimeString()}</p>}
      {p.last_error && p.status !== "ok" && <p className="mt-2 line-clamp-2 border-l-2 border-down pl-2 font-mono text-[11px] text-down" title={p.last_error}>{p.last_error}</p>}
    </Panel>
  );
}

function Usage({ usage }: { usage: Record<string, number> | null }) {
  if (!usage) return <span className="text-faint">-</span>;
  const chips = ["context", "tavily", "firecrawl"].map((p) => [p, (usage[`${p}.search`] ?? 0) + (usage[`${p}.scrape`] ?? 0)] as const).filter(([, n]) => n);
  return (
    <span className="flex flex-wrap gap-1">
      {chips.map(([p, n]) => <Tag key={p} tone={p === "context" ? "info" : "dim"}>{NAME[p]} {n}</Tag>)}
      {usage["jev.decide"] ? <Tag tone="up">Jev {usage["jev.decide"]}</Tag> : null}
      {!chips.length && !usage["jev.decide"] && <span className="text-faint">-</span>}
    </span>
  );
}
