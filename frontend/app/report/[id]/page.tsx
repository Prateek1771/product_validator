import { notFound, redirect } from "next/navigation";
import { Brief } from "@/components/research/Brief";
import type { RunState } from "@/components/research/useRun";
import { Brand } from "@/components/term";
import { domain } from "@/lib/format";
import { currentUser, serverClient } from "@/lib/insforge";
import { playbookLabel } from "@/lib/playbooks";
import { qualityTier, sourceQuality } from "@/lib/quality";
import type { Change, Report, Source } from "@/lib/types";
import { AutoPrint } from "./AutoPrint";

export const metadata = { title: "Report", robots: { index: false, follow: false } };

/** Read-only, always-light report document. `?print=1` opens the browser's Save as PDF dialog. */
export default async function ReportDoc(props: PageProps<"/report/[id]">) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  if (!(await currentUser())) redirect("/login");
  const db = (await serverClient()).database;
  const [{ data: run }, { data: rep }, { data: srcs }, { data: chs }] = await Promise.all([
    db.from("research_runs").select("id, query, created_at").eq("id", id).maybeSingle(),
    db.from("reports").select("summary, content_md").eq("run_id", id).maybeSingle(),
    db.from("sources").select("url, title, type, snippet").eq("run_id", id),
    db.from("changes").select("*").eq("run_id", id).order("created_at"),
  ]);
  if (!run || !rep) notFound();
  const report = { ...rep.summary, markdown: rep.content_md } as Report;
  const sources = (srcs ?? []).map((s) => ({ ...s, title: s.title ?? "", snippet: s.snippet ?? "", type: s.type ?? "other", relevance: "medium" })) as Source[];
  const changes = (chs ?? []).map(({ decision, ...c }) => ({ ...(decision ?? {}), ...c })) as Change[];
  const state: RunState = {
    t0: null, steps: [], plan: [], entities: report.methodology?.entities ?? [], sources, evidence: [], contradictions: [], changes,
    report, needsMore: null, reportId: null, error: null, done: true, models: null, decider: null,
  };
  const date = new Date(run.created_at).toLocaleDateString("en-GB", { dateStyle: "long" });

  return (
    <div data-theme="light" className="print-doc min-h-screen bg-bg text-fg">
      {sp.print === "1" && <AutoPrint />}
      <div className="mx-auto max-w-[900px] bg-panel px-6 py-10 md:px-12 print:max-w-none print:p-0">
        <header className="border-b-2 border-amber pb-6">
          <Brand />
          <p className="mt-8 font-mono text-[12px] font-semibold tracking-wider text-amber">{playbookLabel(report.deliverable?.playbook)} · {date}</p>
          <p className="mt-2 text-[15px] text-dim">{run.query}</p>
        </header>
        <Brief run={state} createdAt={run.created_at} print />
        <section className="break-before-page px-4 pt-8 md:px-6">
          <h2 className="text-xl font-semibold">Sources</h2>
          <p className="mt-1 text-[12px] text-dim">Quality is a heuristic: official pages of a researched company score highest, forums and social posts lowest.</p>
          <ol className="mt-3 space-y-1.5 text-[12.5px]">
            {sources.map((s, i) => {
              const q = sourceQuality(s, report.methodology);
              return (
                <li key={s.url} className="grid grid-cols-[28px_1fr_auto] gap-2 break-inside-avoid">
                  <span className="font-mono text-faint">{i + 1}.</span>
                  <span className="min-w-0"><a href={s.url} className="font-medium hover:text-amber">{s.title || s.url}</a> <span className="font-mono text-[11px] text-dim">{domain(s.url)} · {s.type}</span></span>
                  <span className={`font-mono text-[11px] ${{ high: "text-up", medium: "text-amber", low: "text-down" }[qualityTier(q)]}`}>q{q}</span>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </div>
  );
}
