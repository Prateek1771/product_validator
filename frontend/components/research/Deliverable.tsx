"use client";

import { Tag } from "@/components/term";
import { domain } from "@/lib/format";
import type { Battlecard, CompetitorProfiles, Deliverable, PricingTeardown } from "@/lib/types";

export function DeliverableView({ d }: { d: Deliverable }) {
  if (d.playbook === "profile") return <ProfileView d={d.data} />;
  if (d.playbook === "pricing") return <PricingView d={d.data} />;
  return <BattlecardView d={d.data} />;
}

const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <p className={`label ${className}`}>{children}</p>;

function Bullets({ items, mark = "›", tone = "text-faint" }: { items: string[]; mark?: string; tone?: string }) {
  if (!items.length) return <p className="mt-1.5 font-mono text-[12px] text-faint">unknown</p>;
  return (
    <ul className="mt-1.5 space-y-1 text-[13.5px]">
      {items.map((x, i) => <li key={i} className="flex gap-2"><span className={`font-mono ${tone}`}>{mark}</span><span>{x}</span></li>)}
    </ul>
  );
}

const Chips = ({ items }: { items: string[] }) =>
  items.length ? <div className="mt-1.5 flex flex-wrap gap-1">{items.map((x) => <span key={x} className="rounded-sm border border-line-2 bg-panel-2 px-1.5 py-0.5 text-[12px] text-dim">{x}</span>)}</div>
               : <p className="mt-1.5 font-mono text-[12px] text-faint">unknown</p>;

function SourceLink({ url }: { url: string | null }) {
  if (!url) return null;
  return <a href={url} target="_blank" rel="noreferrer" className="font-mono text-[11px] text-info underline-offset-2 hover:underline">{domain(url)}</a>;
}

function Table({ head, rows }: { head: React.ReactNode[]; rows: React.ReactNode[][] }) {
  return (
    <div className="mt-2 overflow-x-auto rounded border border-line">
      <table className="w-full min-w-[480px] text-left text-[13px]">
        <thead className="bg-panel-2">
          <tr>{head.map((h, i) => <th key={i} scope="col" className="label px-3 py-2 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={`px-3 py-2 align-top ${j === 0 ? "font-medium" : "text-fg/90"}`}>{c}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

// ---------- competitor profiles ----------
const SENTIMENT = { positive: "up", negative: "down", mixed: "amber" } as const;
const DOTS = ["fill-amber", "fill-info", "fill-up", "fill-violet", "fill-down"];

function PositioningMap({ m }: { m: CompetitorProfiles["positioning_map"] }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return (
    <figure className="rounded border border-line p-4">
      <Label>positioning map</Label>
      <p className="mt-2 font-mono text-[11px] text-dim">{m.y_axis.includes("→") ? m.y_axis : `↑ ${m.y_axis}`}</p>
      <svg viewBox="-2 -2 104 104" className="mt-1 w-full max-w-[480px]" role="img"
           aria-label={`Positioning map: ${m.x_axis} by ${m.y_axis}. ` + m.points.map((p) => `${p.name} at ${p.x}, ${p.y}`).join("; ")}>
        <rect x="0" y="0" width="100" height="100" className="fill-panel-2 stroke-line" strokeWidth="0.4" />
        <line x1="50" y1="0" x2="50" y2="100" className="stroke-line-2" strokeWidth="0.3" strokeDasharray="1.5 1.5" />
        <line x1="0" y1="50" x2="100" y2="50" className="stroke-line-2" strokeWidth="0.3" strokeDasharray="1.5 1.5" />
        {m.points.map((p, i) => {
          const x = clamp(p.x), y = 100 - clamp(p.y);
          return (
            <g key={p.name}>
              <circle cx={x} cy={y} r="2.2" className={DOTS[i % DOTS.length]} />
              <text x={x + (x > 75 ? -3.5 : 3.5)} y={y + 1.3} textAnchor={x > 75 ? "end" : "start"} className="fill-fg font-mono" fontSize="3.6">{p.name}</text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 max-w-[480px] text-right font-mono text-[11px] text-dim">{m.x_axis.includes("→") ? m.x_axis : `${m.x_axis} →`}</p>
    </figure>
  );
}

function ProfileView({ d }: { d: CompetitorProfiles }) {
  return (
    <div className="space-y-5">
      <section className="border-l-2 border-amber pl-4">
        <Label className="text-amber">landscape</Label>
        <p className="prose-brief mt-1.5 text-[15px]">{d.landscape}</p>
      </section>

      {d.companies.map((c) => (
        <section key={c.name} className="rounded border border-line">
          <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-line bg-panel-2 px-4 py-3">
            <h3 className="text-lg font-semibold">{c.name}</h3>
            {c.domain && <span className="font-mono text-[11px] text-faint">{c.domain}</span>}
            <span className="text-[13px] text-dim italic">{c.tagline}</span>
          </header>
          <div className="grid gap-5 p-4 md:grid-cols-2">
            <div>
              <Label>positioning</Label>
              <p className="mt-1.5 text-[13.5px]">{c.positioning}</p>
              <Label className="mt-4">target customers</Label>
              <Chips items={c.target_customers} />
              <Label className="mt-4">pricing tiers</Label>
              <ul className="mt-1.5 space-y-1.5">
                {c.pricing_tiers.map((t) => (
                  <li key={t.name} className="rounded-sm bg-panel-2 px-3 py-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium">{t.name}</span>
                      <span className="font-mono text-[13px] text-amber">{t.price}</span>
                      <span className="font-mono text-[10px] text-faint">{t.unit}</span>
                    </div>
                    {t.includes.length > 0 && <p className="mt-0.5 text-[12px] text-dim">{t.includes.join(" · ")}</p>}
                  </li>
                ))}
                {!c.pricing_tiers.length && <li className="font-mono text-[12px] text-faint">not published</li>}
              </ul>
            </div>
            <div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><Label className="text-up">strengths</Label><Bullets items={c.strengths} mark="+" tone="text-up" /></div>
                <div><Label className="text-down">weaknesses</Label><Bullets items={c.weaknesses} mark="−" tone="text-down" /></div>
              </div>
              <Label className="mt-4">key features</Label>
              <Chips items={c.key_features} />
              {c.integrations.length > 0 && <><Label className="mt-4">integrations</Label><Chips items={c.integrations} /></>}
              {c.notable_customers.length > 0 && <><Label className="mt-4">notable customers</Label><Chips items={c.notable_customers} /></>}
            </div>
          </div>
          {(c.review_themes.length > 0 || c.recent_changes.length > 0) && (
            <div className="grid gap-5 border-t border-line p-4 md:grid-cols-2">
              <div>
                <Label>review themes</Label>
                <ul className="mt-1.5 space-y-2">
                  {c.review_themes.map((r, i) => (
                    <li key={i} className="text-[13px]">
                      <div className="flex items-center gap-2"><Tag tone={SENTIMENT[r.sentiment]}>{r.sentiment}</Tag><span className="font-medium">{r.theme}</span></div>
                      {r.quote && <p className="mt-1 font-mono text-[12px] text-dim">“{r.quote}” <SourceLink url={r.source_url} /></p>}
                    </li>
                  ))}
                </ul>
              </div>
              <div><Label>recent changes</Label><Bullets items={c.recent_changes} mark="◆" tone="text-amber" /></div>
            </div>
          )}
        </section>
      ))}

      <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <PositioningMap m={d.positioning_map} />
        <div className="space-y-3">
          <div className="rounded border border-line p-4"><Label>takeaways</Label><Bullets items={d.takeaways} /></div>
          <div className="rounded border border-line p-4"><Label className="text-up">opportunities</Label><Bullets items={d.opportunities} mark="→" tone="text-up" /></div>
        </div>
      </div>
    </div>
  );
}

// ---------- pricing teardown ----------
const DIRECTION = { up: ["down", "▲ up"], down: ["up", "▼ down"], new: ["info", "new"], removed: ["dim", "removed"] } as const;
const VERDICT = { pass: "up", partial: "amber", gap: "down" } as const;

function PricingView({ d }: { d: PricingTeardown }) {
  const names = d.companies.map((c) => c.name);
  return (
    <div className="space-y-5">
      <section className="border-l-2 border-amber pl-4">
        <Label className="text-amber">recommendation</Label>
        <p className="prose-brief mt-1.5 text-[15px]">{d.recommendation}</p>
      </section>

      {d.comparison.length > 0 && (
        <section>
          <Label>side by side</Label>
          <Table head={["dimension", ...names]} rows={d.comparison.map((r) => [r.dimension, ...names.map((_, i) => r.values[i] ?? "—")])} />
        </section>
      )}

      {d.companies.map((c) => {
        const pass = c.page_rubric.filter((v) => v.verdict === "pass").length;
        return (
          <section key={c.name} className="rounded border border-line">
            <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-panel-2 px-4 py-3">
              <h3 className="text-lg font-semibold">{c.name}</h3>
              <span className="font-mono text-[11px] text-dim">VALUE METRIC <span className="text-fg">{c.value_metric}</span></span>
              <span className="font-mono text-[11px] text-dim">FREE <span className="text-fg">{c.free_tier}</span></span>
            </header>
            <div className="p-4">
              <Table head={["tier", "price", "billing", "limits"]}
                     rows={c.tiers.map((t) => [t.name, <span key="p" className="font-mono text-amber">{t.price}</span>, t.billing,
                       <span key="l">{t.limits}{t.notes && <span className="block text-[12px] text-dim">{t.notes}</span>}</span>])} />
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <Label>price changes</Label>
                  <ol className="mt-1.5 space-y-1.5">
                    {c.changes.map((x, i) => (
                      <li key={i} className="flex items-start gap-2 text-[13px]">
                        <Tag tone={DIRECTION[x.direction][0]}>{DIRECTION[x.direction][1]}</Tag>
                        <span className="min-w-0 flex-1">{x.what}</span>
                        {x.date && <span className="shrink-0 font-mono text-[11px] text-faint">{x.date}</span>}
                      </li>
                    ))}
                    {!c.changes.length && <li className="font-mono text-[12px] text-faint">none found in sources</li>}
                  </ol>
                </div>
                {c.page_rubric.length > 0 && (
                  <div>
                    <Label>pricing page rubric · {pass}/{c.page_rubric.length} pass</Label>
                    <ul className="mt-1.5 space-y-1.5">
                      {c.page_rubric.map((v) => (
                        <li key={v.dimension} className="grid grid-cols-[64px_1fr] gap-2 text-[13px]">
                          <Tag tone={VERDICT[v.verdict]} className="justify-center">{v.verdict}</Tag>
                          <span><span className="font-medium">{v.dimension}</span> <span className="text-dim">{v.note}</span></span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}

      <div className="rounded border border-line p-4"><Label>insights</Label><Bullets items={d.insights} /></div>
    </div>
  );
}

// ---------- battlecard ----------
function BattlecardView({ d }: { d: Battlecard }) {
  return (
    <div className="space-y-5">
      <section className="border-l-2 border-amber pl-4">
        <Label className="text-amber">{d.subject} vs {d.competitor} · tl;dr</Label>
        <p className="prose-brief mt-1.5 text-[15px]">{d.tldr}</p>
      </section>

      <div className="grid gap-px overflow-hidden rounded border border-line bg-line md:grid-cols-2">
        <div className="bg-panel p-4"><Label className="text-up">where {d.subject} wins</Label><Bullets items={d.subject_wins} mark="+" tone="text-up" /></div>
        <div className="bg-panel p-4"><Label className="text-info">where {d.competitor} wins</Label><Bullets items={d.competitor_wins} mark="+" tone="text-info" /></div>
      </div>

      {d.features.length > 0 && (
        <section><Label>feature comparison</Label><Table head={["feature", d.subject, d.competitor]} rows={d.features.map((f) => [f.feature, f.subject, f.competitor])} /></section>
      )}

      <div className="rounded border border-line p-4"><Label>pricing</Label><p className="mt-1.5 text-[13.5px]">{d.pricing_notes}</p></div>

      <section>
        <Label>objection handling</Label>
        <ol className="mt-2 divide-y divide-line rounded border border-line">
          {d.objections.map((o, i) => (
            <li key={i} className="grid gap-1 p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-4">
              <p className="text-[13.5px] font-medium"><span className="font-mono text-down">“</span>{o.objection}<span className="font-mono text-down">”</span></p>
              <p className="text-[13.5px] text-fg/90"><span className="font-mono text-up">→ </span>{o.response}</p>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border border-line p-4"><Label className="text-amber">landmine questions</Label><Bullets items={d.landmines} mark="?" tone="text-amber" /></div>
        <div className="rounded border border-line p-4"><Label className="text-up">pick {d.subject} if</Label><Bullets items={d.pick_subject_if} mark="✓" tone="text-up" /></div>
        <div className="rounded border border-line p-4"><Label className="text-info">pick {d.competitor} if</Label><Bullets items={d.pick_competitor_if} mark="✓" tone="text-info" /></div>
      </div>

      <div className="rounded border border-line p-4"><Label>migration</Label><p className="mt-1.5 text-[13.5px]">{d.migration}</p></div>

      {d.proof_points.length > 0 && (
        <section className="rounded border border-line p-4">
          <Label>proof points</Label>
          <ul className="mt-1.5 space-y-1.5 text-[13.5px]">
            {d.proof_points.map((p, i) => <li key={i} className="flex flex-wrap gap-x-2"><span className="font-mono text-faint">§</span><span>{p.claim}</span><SourceLink url={p.source_url} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
