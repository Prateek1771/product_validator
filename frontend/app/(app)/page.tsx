import Link from "next/link";
import { PromptHero } from "@/components/PromptHero";
import { SignalsTable, type SignalRow } from "@/components/SignalsTable";
import { SystemMini } from "@/components/SystemMini";
import { Blocks, Empty, Favicon, Panel, STATUS_TONE, Tag } from "@/components/term";
import { serverClient } from "@/lib/insforge";
import { timeAgo } from "@/lib/format";

export const metadata = { title: "Terminal" };

type RunRow = { id: string; query: string; status: string; mode: string; created_at: string; duration: number | null };
type Company = { id: string; name: string; domain: string | null };

export default async function TerminalHome() {
  const db = (await serverClient()).database;
  const [{ data: signals }, { data: runs }, { data: companies }] = await Promise.all([
    db.from("changes").select("id, run_id, company, change_type, title, impact_score, recommended_action, created_at")
      .eq("is_real_change", true).order("created_at", { ascending: false }).limit(40),
    db.from("research_runs").select("id, query, status, mode, created_at, duration:state->duration")
      .order("created_at", { ascending: false }).limit(8),
    db.from("companies").select("id, name, domain").order("created_at", { ascending: false }).limit(12),
  ]);
  const rows = (signals ?? []) as SignalRow[];
  const watch = ((companies ?? []) as Company[]).map((c) => {
    const mine = rows.filter((r) => r.company?.toLowerCase() === c.name.toLowerCase());
    return { ...c, n: mine.length, top: Math.max(0, ...mine.map((r) => r.impact_score ?? 0)) };
  }).sort((a, b) => b.top - a.top);
  const high = rows.filter((r) => (r.impact_score ?? 0) > 70).length;

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-[1400px] space-y-3 p-3 md:p-4">
        <section className="panel relative overflow-hidden px-4 py-6 md:px-8 md:py-10">
          <p className="label"><span className="text-amber">●</span> agentic market intelligence · openai · langgraph · context.dev · jev</p>
          <h1 className="cursor mt-3 max-w-3xl text-2xl font-semibold tracking-tight md:text-4xl">What changed, why it matters, what to do.</h1>
          <div className="mt-6 max-w-3xl"><PromptHero /></div>
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] text-dim">
            <div><dt className="inline text-faint">SIGNALS </dt><dd className="inline text-fg">{rows.length}</dd></div>
            <div><dt className="inline text-faint">HIGH IMPACT </dt><dd className="inline text-down">{high}</dd></div>
            <div><dt className="inline text-faint">COMPANIES </dt><dd className="inline text-fg">{watch.length}</dd></div>
            <div><dt className="inline text-faint">RUNS </dt><dd className="inline text-fg">{runs?.length ?? 0}</dd></div>
          </dl>
        </section>

        <div className="grid gap-3 lg:grid-cols-12">
          <Panel title="Signals" count={rows.length} className="lg:col-span-8"
                 actions={<Link href="/signals" className="font-mono text-[10px] text-dim hover:text-amber">ALL →</Link>}>
            <SignalsTable rows={rows.slice(0, 12)} />
          </Panel>

          <div className="grid gap-3 lg:col-span-4">
            <Panel title="Watchlist" count={watch.length} actions={<Link href="/companies" className="font-mono text-[10px] text-dim hover:text-amber">ALL →</Link>}>
              {watch.length ? (
                <ul className="divide-y divide-line/60">
                  {watch.slice(0, 6).map((c) => (
                    <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                      <Favicon url={c.domain ? `https://${c.domain}` : null} />
                      <span className="min-w-0 flex-1 truncate font-mono text-[12px] font-semibold uppercase">{c.name}</span>
                      <Blocks value={c.top} n={8} label="max impact" />
                      <span className="w-6 text-right font-mono text-[11px] text-faint">{c.n}</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty title="Nothing tracked">Companies are added as research mentions them.</Empty>}
            </Panel>
            <Panel title="System"><SystemMini /></Panel>
          </div>
        </div>

        <Panel title="Recent runs" count={runs?.length ?? 0} actions={<Link href="/history" className="font-mono text-[10px] text-dim hover:text-amber">HISTORY →</Link>}>
          {runs?.length ? (
            <ul className="divide-y divide-line/60">
              {(runs as RunRow[]).map((r) => (
                <li key={r.id}>
                  <Link href={`/research/${r.id}`} className="flex items-center gap-3 px-3 py-2 hover:bg-hover">
                    <Tag tone={STATUS_TONE[r.status] ?? "amber"}>{r.status}</Tag>
                    <span className="min-w-0 flex-1 truncate">{r.query}</span>
                    <span className="hidden font-mono text-[11px] text-faint uppercase sm:inline">{r.mode}</span>
                    <span className="w-14 text-right font-mono text-[11px] text-dim">{r.duration != null ? `${Math.round(r.duration)}s` : "-"}</span>
                    <span className="w-24 text-right font-mono text-[11px] text-faint">{timeAgo(r.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : <Empty title="No runs yet">Press Ctrl K or use the prompt above.</Empty>}
        </Panel>
      </div>
    </div>
  );
}
