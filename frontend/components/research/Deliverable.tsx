"use client";

import { Download, Star } from "lucide-react";
import { Blocks, Tag } from "@/components/term";
import { domain } from "@/lib/format";
import type { Battlecard, CompanyPricing, CompanyProfile, CompetitorProfiles, Deliverable, PricingTeardown, Row, Verdict } from "@/lib/types";

// Reports saved before the skill-template schemas miss most fields: every read goes through these.
const arr = <T,>(x: T[] | null | undefined): T[] => (Array.isArray(x) ? x : []);
const txt = (x: unknown) => (typeof x === "string" && x.trim() ? x : "");

export function DeliverableView({ d }: { d: Deliverable }) {
  return (
    <div className="space-y-5">
      <Exports d={d} />
      {d.playbook === "profile" ? <ProfileView d={d.data} /> : d.playbook === "pricing" ? <PricingView d={d.data} /> : <BattlecardView d={d.data} />}
    </div>
  );
}

function save(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Exports({ d }: { d: Deliverable }) {
  const btn = "inline-flex h-7 items-center gap-1.5 rounded-sm border border-line-2 px-2 font-mono text-[11px] text-dim transition hover:border-amber hover:text-amber";
  return (
    <div className="flex flex-wrap items-center gap-1.5" data-print-hide>
      <span className="label mr-1">export</span>
      <button className={btn} onClick={() => save(`${d.playbook}-data.json`, JSON.stringify(d.data, null, 2), "application/json")}>
        <Download className="size-3" /> data.json
      </button>
      {arr(d.files).map((f) => (
        <button key={f.name} className={btn} onClick={() => save(f.name, f.markdown, "text/markdown")}><Download className="size-3" /> {f.name}</button>
      ))}
    </div>
  );
}

// ---------- primitives ----------
const Label = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => <p className={`label ${className}`}>{children}</p>;
const Unknown = () => <p className="mt-1.5 font-mono text-[12px] text-faint">unknown</p>;

function Bullets({ items, mark = "›", tone = "text-faint" }: { items: React.ReactNode[]; mark?: string; tone?: string }) {
  if (!items.length) return <Unknown />;
  return (
    <ul className="mt-1.5 space-y-1 text-[13.5px]">
      {items.map((x, i) => <li key={i} className="flex gap-2"><span className={`shrink-0 font-mono ${tone}`}>{mark}</span><span className="min-w-0">{x}</span></li>)}
    </ul>
  );
}

const Chips = ({ items }: { items: string[] }) =>
  items.length ? <div className="mt-1.5 flex flex-wrap gap-1">{items.map((x) => <span key={x} className="rounded-sm border border-line-2 bg-panel-2 px-1.5 py-0.5 text-[12px] text-dim">{x}</span>)}</div>
               : <Unknown />;

function SourceLink({ url }: { url: string | null | undefined }) {
  if (!url?.startsWith("http")) return null;
  return <a href={url} target="_blank" rel="noreferrer" className="ml-1 font-mono text-[11px] text-info underline-offset-2 hover:underline">{domain(url)}</a>;
}

type Pt = { point?: string; claim?: string; source_url: string | null };
const sourced = (x: Pt | string) => (typeof x === "string" ? x : <>{x.point ?? x.claim}<SourceLink url={x.source_url} /></>);

function Table({ head, rows, minW = 480 }: { head: React.ReactNode[]; rows: React.ReactNode[][]; minW?: number }) {
  if (!rows.length) return <Unknown />;
  return (
    <div className="mt-2 overflow-x-auto rounded border border-line">
      <table className="w-full text-left text-[13px]" style={{ minWidth: minW }}>
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

const Matrix = ({ names, rows, first = "dimension" }: { names: string[]; rows: Row[]; first?: string }) =>
  <Table head={[first, ...names]} rows={arr(rows).map((r) => [r.dimension, ...names.map((_, i) => arr(r.values)[i] ?? "—")])} minW={200 + 180 * names.length} />;

const Box = ({ title, tone = "", children, className = "" }: { title: React.ReactNode; tone?: string; children: React.ReactNode; className?: string }) =>
  <div className={`rounded border border-line p-4 ${className}`}><Label className={tone}>{title}</Label>{children}</div>;

const Lead = ({ title, children }: { title: React.ReactNode; children: React.ReactNode }) => (
  <section className="border-l-2 border-amber pl-4">
    <Label className="text-amber">{title}</Label>
    <p className="prose-brief mt-1.5 text-[15px]">{children}</p>
  </section>
);

/** One collapsible card per company, open by default. */
function CompanyCard({ title, meta, children }: { title: string; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <details open className="group rounded border border-line">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 border-b border-line bg-panel-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="font-mono text-amber transition group-open:rotate-90" aria-hidden>›</span>
        <h3 className="text-lg font-semibold">{title}</h3>
        {meta}
      </summary>
      <div className="space-y-5 p-4">{children}</div>
    </details>
  );
}

const Grid2 = ({ children }: { children: React.ReactNode }) => <div className="grid gap-5 md:grid-cols-2">{children}</div>;

// ---------- competitor profiles ----------
const SENTIMENT = { positive: "up", negative: "down", mixed: "amber" } as const;
const DOTS = ["fill-amber", "fill-info", "fill-up", "fill-violet", "fill-down"];

function PositioningMap({ m }: { m: CompetitorProfiles["positioning_map"] | undefined }) {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const points = arr(m?.points);
  if (!m || !points.length) return null;
  return (
    <figure className="rounded border border-line p-4">
      <Label>positioning map</Label>
      <p className="mt-2 font-mono text-[11px] text-dim">{m.y_axis.includes("→") ? m.y_axis : `↑ ${m.y_axis}`}</p>
      <svg viewBox="-2 -2 104 104" className="mt-1 w-full max-w-[480px]" role="img"
           aria-label={`Positioning map: ${m.x_axis} by ${m.y_axis}. ` + points.map((p) => `${p.name} at ${p.x}, ${p.y}`).join("; ")}>
        <rect x="0" y="0" width="100" height="100" className="fill-panel-2 stroke-line" strokeWidth="0.4" />
        <line x1="50" y1="0" x2="50" y2="100" className="stroke-line-2" strokeWidth="0.3" strokeDasharray="1.5 1.5" />
        <line x1="0" y1="50" x2="100" y2="50" className="stroke-line-2" strokeWidth="0.3" strokeDasharray="1.5 1.5" />
        {points.map((p, i) => {
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
      {arr(m.interpretation).length > 0 && <Bullets items={m.interpretation} mark="◆" tone="text-amber" />}
    </figure>
  );
}

const GLANCE: [keyof CompanyProfile["at_a_glance"], string][] = [
  ["tagline", "tagline"], ["founded", "founded"], ["headquarters", "hq"], ["team_size", "team"], ["funding", "funding"],
  ["starting_price", "starts at"], ["free_tier", "free tier"],
];

type OldProfile = { tagline?: string; positioning?: string; key_features?: string[]; pricing_tiers?: { name: string; price: string; includes: string[] }[] };

function ProfileCompany({ c }: { c: CompanyProfile & OldProfile }) {
  const g = c.at_a_glance, sp = c.social_proof, p = c.pricing;
  const tiers = p ? arr(p.tiers) : arr(c.pricing_tiers).map((t) => ({ name: t.name, price: t.price, inclusions: t.includes }));
  return (
    <CompanyCard title={c.name} meta={<>{c.domain && <span className="font-mono text-[11px] text-faint">{c.domain}</span>}
      {txt(c.positioning_angle || c.positioning) && <Tag tone="violet" className="max-w-full truncate">{c.positioning_angle || c.positioning}</Tag>}</>}>
      {g ? (
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded border border-line bg-line sm:grid-cols-3 lg:grid-cols-4">
          {GLANCE.map(([k, l]) => (
            <div key={k} className={`bg-panel px-3 py-2 ${k === "tagline" ? "col-span-2" : ""}`}>
              <dt className="label">{l}</dt><dd className="mt-0.5 text-[13px]">{txt(g[k]) || <span className="text-faint">unknown</span>}</dd>
            </div>
          ))}
        </dl>
      ) : txt(c.tagline) && <p className="text-[13px] text-dim italic">{c.tagline}</p>}

      <Grid2>
        <div>
          <Label>positioning & messaging</Label>
          {c.value_prop && <blockquote className="mt-1.5 rounded-sm bg-panel-2 px-3 py-2 text-[14px]"><span className="font-medium">“{c.value_prop.headline}”</span>
            {txt(c.value_prop.subheadline) && <span className="block text-[13px] text-dim">{c.value_prop.subheadline}</span>}</blockquote>}
          {txt(c.target_audience) && <p className="mt-2 text-[13.5px]"><span className="text-dim">Audience:</span> {c.target_audience}</p>}
          <Label className="mt-4">messaging themes</Label>
          <Bullets items={arr(c.messaging_themes).map(sourced)} />
        </div>
        <div>
          <Label>pricing</Label>
          <ul className="mt-1.5 space-y-1.5">
            {tiers.map((t) => (
              <li key={t.name} className="rounded-sm bg-panel-2 px-3 py-2">
                <div className="flex flex-wrap items-baseline gap-2"><span className="font-medium">{t.name}</span><span className="font-mono text-[13px] text-amber">{t.price}</span></div>
                {arr(t.inclusions).length > 0 && <p className="mt-0.5 text-[12px] text-dim">{t.inclusions.join(" · ")}</p>}
              </li>
            ))}
          </ul>
          {!tiers.length && <Unknown />}
          {p && <p className="mt-2 text-[12.5px] text-dim"><span className="text-fg">Billing:</span> {p.billing} · <span className="text-fg">Trial:</span> {p.free_trial}
            {txt(p.notable) && <> · <span className="text-fg">Notable:</span> {p.notable}</>}</p>}
        </div>
      </Grid2>

      <Grid2>
        <div>
          <Label>core capabilities</Label>
          <Bullets items={c.capabilities ? arr(c.capabilities).map((x) => <><span className="font-medium">{x.name}</span> <span className="text-dim">— {x.description}</span></>) : arr(c.key_features)} />
          <Label className="mt-4">differentiators</Label>
          <Bullets items={arr(c.differentiators)} mark="◆" tone="text-violet" />
        </div>
        <div>
          <Label>integrations {txt(c.integrations?.count) && <span className="text-faint">· {c.integrations.count}</span>}</Label>
          <Chips items={Array.isArray(c.integrations) ? c.integrations : arr(c.integrations?.key)} />
          <Label className="mt-4">product direction</Label>
          <Bullets items={arr(c.product_direction)} mark="◆" tone="text-amber" />
        </div>
      </Grid2>

      <Grid2>
        <div>
          <Label>customers & social proof</Label>
          <Chips items={arr(sp?.named_customers)} />
          {arr(sp?.industries).length > 0 && <p className="mt-2 text-[13px]"><span className="text-dim">Industries:</span> {sp.industries.join(", ")}</p>}
          {arr(sp?.case_study_themes).length > 0 && <><Label className="mt-3">case study themes</Label><Bullets items={sp.case_study_themes} /></>}
          {arr(sp?.ratings).length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {sp.ratings.map((r) => <span key={r.site} className="rounded-sm border border-line px-2 py-1 font-mono text-[12px]">{r.site} <span className="text-amber">{r.rating}</span> <span className="text-faint">({r.count})</span></span>)}
            </div>
          )}
        </div>
        <div>
          <Label>review themes</Label>
          <ul className="mt-1.5 space-y-2">
            {arr(c.review_themes).map((r, i) => (
              <li key={i} className="text-[13px]">
                <div className="flex items-center gap-2"><Tag tone={SENTIMENT[r.sentiment] ?? "dim"}>{r.sentiment}</Tag><span className="font-medium">{r.theme}</span></div>
                {r.quote && <p className="mt-1 font-mono text-[12px] text-dim">“{r.quote}”<SourceLink url={r.source_url} /></p>}
              </li>
            ))}
          </ul>
          {!arr(c.review_themes).length && <Unknown />}
        </div>
      </Grid2>

      <Grid2>
        <div><Label className="text-up">strengths</Label><Bullets items={arr<Pt | string>(c.strengths).map(sourced)} mark="+" tone="text-up" /></div>
        <div><Label className="text-down">weaknesses</Label><Bullets items={arr<Pt | string>(c.weaknesses).map(sourced)} mark="−" tone="text-down" /></div>
      </Grid2>

      {c.implications && (
        <Grid2>
          <div><Label className="text-up">opportunities (vs them)</Label><Bullets items={arr(c.implications.opportunities)} mark="→" tone="text-up" /></div>
          <div><Label className="text-down">threats (from them)</Label><Bullets items={arr(c.implications.threats)} mark="!" tone="text-down" /></div>
        </Grid2>
      )}

      {c.content_signals && <div><Label>content strategy</Label><Chips items={[...arr(c.content_signals.content_types), ...arr(c.content_signals.focus_areas)]} /></div>}

      {arr(c.sources).length > 0 && (
        <div>
          <Label>raw data sources</Label>
          <ul className="mt-1.5 grid gap-x-4 gap-y-1 text-[12.5px] sm:grid-cols-2">
            {c.sources.map((s) => <li key={s.url} className="truncate"><span className="text-dim">{s.page}</span><SourceLink url={s.url} /></li>)}
          </ul>
        </div>
      )}
    </CompanyCard>
  );
}

function ProfileView({ d }: { d: CompetitorProfiles }) {
  const companies = arr(d.companies);
  return (
    <div className="space-y-5">
      <Lead title="landscape">{d.landscape}</Lead>
      {arr(d.comparison).length > 0 && <section><Label>side-by-side comparison</Label><Matrix names={companies.map((c) => c.name)} rows={d.comparison} /></section>}
      <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <PositioningMap m={d.positioning_map} />
        <div className="space-y-3">
          <Box title="key takeaways"><Bullets items={arr(d.takeaways)} /></Box>
          <Box title="gaps & opportunities" tone="text-up"><Bullets items={arr(d.opportunities)} mark="→" tone="text-up" /></Box>
        </div>
      </div>
      {companies.map((c) => <ProfileCompany key={c.name} c={c} />)}
    </div>
  );
}

// ---------- pricing teardown ----------
const DIRECTION = { up: ["down", "▲ up"], down: ["up", "▼ down"], new: ["info", "new"], removed: ["dim", "removed"] } as const;
const VERDICT = { pass: "up", partial: "amber", gap: "down" } as const;
const IMPACT = { high: "up", medium: "amber", low: "dim" } as const;   // high impact is good
const EFFORT = { high: "down", medium: "amber", low: "up" } as const;  // low effort is good

function Rubric({ title, items }: { title: string; items: Verdict[] }) {
  const pass = items.filter((v) => v.verdict === "pass").length;
  return (
    <div>
      <div className="flex items-center gap-2">
        <Label>{title}</Label>
        <span className="ml-auto font-mono text-[12px]"><span className="text-up">{pass}</span>/{items.length} pass</span>
        <Blocks value={items.length ? (100 * pass) / items.length : 0} n={items.length || 1} tone="up" label={`${title} passing`} />
      </div>
      <ul className="mt-2 space-y-1.5">
        {items.map((v) => (
          <li key={v.dimension} className="grid grid-cols-[64px_1fr] gap-2 text-[13px]">
            <Tag tone={VERDICT[v.verdict] ?? "dim"} className="justify-center">{v.verdict}</Tag>
            <span><span className="font-medium">{v.dimension}</span> <span className="text-dim">{v.note}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingCompany({ c }: { c: CompanyPricing & { page_rubric?: Verdict[] } }) {
  return (
    <CompanyCard title={c.name} meta={<>
      {txt(c.pricing_model) && <Tag tone="violet">{c.pricing_model}</Tag>}
      <span className="font-mono text-[11px] text-dim">VALUE METRIC <span className="text-fg">{c.value_metric}</span></span>
      <span className="font-mono text-[11px] text-dim">FREE <span className="text-fg">{c.free_tier}</span></span></>}>
      {(txt(c.billing_options) || txt(c.annual_discount)) && (
        <p className="font-mono text-[12px] text-dim">BILLING <span className="text-fg">{c.billing_options || "unknown"}</span> · ANNUAL DISCOUNT <span className="text-fg">{c.annual_discount || "unknown"}</span></p>
      )}
      <Table head={["tier", "price", "billing", "limits", "includes"]} minW={640}
             rows={arr(c.tiers).map((t) => [
               <span key="n" className="inline-flex items-center gap-1">{t.name}{t.is_anchor && <Star className="size-3 fill-amber text-amber" aria-label="anchor tier" />}</span>,
               <span key="p" className="font-mono text-amber">{t.price}</span>, t.billing,
               <span key="l">{t.limits}{t.notes && <span className="block text-[12px] text-dim">{t.notes}</span>}</span>,
               <span key="i" className="text-[12px] text-dim">{arr(t.inclusions).join(" · ")}</span>])} />
      <Grid2>
        <div>
          {txt(c.enterprise) && <><Label>enterprise</Label><p className="mt-1.5 mb-4 text-[13.5px]">{c.enterprise}</p></>}
          <Label>hidden costs & add-ons</Label>
          <Bullets items={arr(c.hidden_costs)} mark="$" tone="text-down" />
        </div>
        <div>
          <Label>price changes</Label>
          <ol className="mt-1.5 space-y-1.5">
            {arr(c.changes).map((x, i) => (
              <li key={i} className="flex items-start gap-2 text-[13px]">
                <Tag tone={DIRECTION[x.direction]?.[0] ?? "dim"}>{DIRECTION[x.direction]?.[1] ?? x.direction}</Tag>
                <span className="min-w-0 flex-1">{x.what}<SourceLink url={x.source_url} /></span>
                {x.date && <span className="shrink-0 font-mono text-[11px] text-faint">{x.date}</span>}
              </li>
            ))}
          </ol>
          {!arr(c.changes).length && <Unknown />}
        </div>
      </Grid2>
      <Grid2>
        {arr(c.rubric_human).length > 0 && <Rubric title="human buyer experience" items={c.rubric_human} />}
        {arr(c.rubric_agent).length > 0 && <Rubric title="ai-agent readiness" items={c.rubric_agent} />}
        {arr(c.page_rubric).length > 0 && <Rubric title="pricing page rubric" items={arr(c.page_rubric)} />}
      </Grid2>
      {txt(c.paste_test) && <Box title="paste test"><p className="mt-1.5 text-[13.5px]">{c.paste_test}</p></Box>}
      {arr(c.fixes).length > 0 && (
        <section>
          <Label>prioritized fixes · impact × effort</Label>
          <Table head={["#", "fix", "impact", "effort", "why"]} minW={600}
                 rows={c.fixes.map((f, i) => [i + 1, f.fix, <Tag key="i" tone={IMPACT[f.impact] ?? "dim"}>{f.impact}</Tag>,
                   <Tag key="e" tone={EFFORT[f.effort] ?? "dim"}>{f.effort}</Tag>, <span key="w" className="text-dim">{f.why}</span>])} />
        </section>
      )}
      {txt(c.the_one_thing) && <Lead title="the one thing">{c.the_one_thing}</Lead>}
    </CompanyCard>
  );
}

function PricingView({ d }: { d: PricingTeardown }) {
  const companies = arr(d.companies), names = companies.map((c) => c.name);
  return (
    <div className="space-y-5">
      <Lead title="recommendation">{d.recommendation}</Lead>
      {arr(d.comparison).length > 0 && <section><Label>side by side</Label><Matrix names={names} rows={d.comparison} /></section>}
      {arr(d.cost_scenarios).length > 0 && <section><Label>cost scenarios</Label><Matrix names={names} rows={d.cost_scenarios} first="scenario" /></section>}
      <Box title="insights"><Bullets items={arr(d.insights)} /></Box>
      {companies.map((c) => <PricingCompany key={c.name} c={c} />)}
    </div>
  );
}

// ---------- battlecard ----------
type OldBattle = { pricing_notes?: string; pick_subject_if?: string[]; pick_competitor_if?: string[] };

function BattlecardView({ d }: { d: Battlecard & OldBattle }) {
  const sides = arr(d.companies);
  const find = (n: string, i: number) => sides.find((x) => x.name === n) ?? sides[i];
  const S = find(d.subject, 0), C = find(d.competitor, 1);
  const mig = d.migration;
  const pricing = d.pricing && typeof d.pricing === "object" ? d.pricing : null;
  return (
    <div className="space-y-5">
      <Lead title={`${d.subject} vs ${d.competitor} · tl;dr`}>{d.tldr}</Lead>

      <div className="grid gap-px overflow-hidden rounded border border-line bg-line md:grid-cols-2">
        <div className="bg-panel p-4"><Label className="text-up">where {d.subject} wins</Label><Bullets items={arr(d.subject_wins)} mark="+" tone="text-up" /></div>
        <div className="bg-panel p-4"><Label className="text-info">where {d.competitor} wins</Label><Bullets items={arr(d.competitor_wins)} mark="+" tone="text-info" /></div>
      </div>

      {arr(d.category_comparisons).map((k) => (
        <section key={k.category} className="overflow-hidden rounded border border-line">
          <h3 className="border-b border-line bg-panel-2 px-4 py-2 font-semibold">{k.category}</h3>
          <div className="grid gap-px bg-line md:grid-cols-2">
            <div className="bg-panel p-4"><Label className="text-up">{d.subject}</Label><p className="mt-1.5 text-[13.5px]">{k.subject}</p></div>
            <div className="bg-panel p-4"><Label className="text-info">{d.competitor}</Label><p className="mt-1.5 text-[13.5px]">{k.competitor}</p></div>
          </div>
          <p className="border-t border-line px-4 py-2 text-[13px]"><span className="font-mono text-[11px] text-amber">BOTTOM LINE </span>{k.bottom_line}</p>
        </section>
      ))}

      {arr(d.features).length > 0 && (
        <section><Label>feature comparison</Label>
          <Table head={["category", "feature", d.subject, d.competitor]} minW={640}
                 rows={d.features.map((f) => [f.category ?? "", f.feature, f.subject, f.competitor])} /></section>
      )}

      {arr(d.ratings).length > 0 && (
        <section><Label>ratings</Label>
          <Table head={["category", d.subject, d.competitor, "notes"]} minW={600}
                 rows={d.ratings.map((r) => [r.dimension,
                   <span key="s" className="inline-flex items-center gap-2 whitespace-nowrap"><Blocks value={r.subject * 20} n={5} tone="up" label={`${d.subject} ${r.dimension}`} />{r.subject}/5</span>,
                   <span key="c" className="inline-flex items-center gap-2 whitespace-nowrap"><Blocks value={r.competitor * 20} n={5} tone="info" label={`${d.competitor} ${r.dimension}`} />{r.competitor}/5</span>,
                   <span key="n" className="text-dim">{r.note}</span>])} /></section>
      )}

      <section>
        <Label>pricing</Label>
        {pricing ? <>
          <Table head={["", d.subject, d.competitor]} rows={arr(pricing.rows).map((r) => [r.item, r.subject, r.competitor])} />
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Box title="total cost consideration"><p className="mt-1.5 text-[13.5px]">{pricing.total_cost}</p></Box>
            <Box title="value comparison"><p className="mt-1.5 text-[13.5px]">{pricing.value_comparison}</p></Box>
          </div>
        </> : <p className="mt-1.5 text-[13.5px]">{d.pricing_notes}</p>}
      </section>

      {S && C ? (
        <>
          <section><Label>service & support</Label>
            <Table head={["", d.subject, d.competitor]}
                   rows={(["documentation", "channels", "sla", "onboarding"] as const).map((k) => [k === "sla" ? "SLA" : k[0].toUpperCase() + k.slice(1), S.support?.[k] ?? "—", C.support?.[k] ?? "—"])} /></section>
          <div className="grid gap-3 md:grid-cols-2">
            {[S, C].map((x, i) => (
              <Box key={x.name} title={`who should choose ${x.name}`} tone={i ? "text-info" : "text-up"}>
                <Bullets items={arr(x.choose_if)} mark="✓" tone={i ? "text-info" : "text-up"} />
                {txt(x.ideal_customer) && <p className="mt-3 rounded-sm bg-panel-2 px-3 py-2 text-[13px]"><span className="font-mono text-[11px] text-dim">IDEAL CUSTOMER </span>{x.ideal_customer}</p>}
              </Box>
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <Box title={`pick ${d.subject} if`} tone="text-up"><Bullets items={arr(d.pick_subject_if)} mark="✓" tone="text-up" /></Box>
          <Box title={`pick ${d.competitor} if`} tone="text-info"><Bullets items={arr(d.pick_competitor_if)} mark="✓" tone="text-info" /></Box>
        </div>
      )}

      <Box title="migration">
        {typeof mig === "string" ? <p className="mt-1.5 text-[13.5px]">{mig}</p> : mig && <>
          <Grid2>
            <div><p className="mt-2 font-mono text-[11px] text-up">WHAT TRANSFERS</p><Bullets items={arr(mig.transfers)} mark="→" tone="text-up" /></div>
            <div><p className="mt-2 font-mono text-[11px] text-amber">WHAT NEEDS RECONFIGURATION</p><Bullets items={arr(mig.reconfigure)} mark="⚙" tone="text-amber" /></div>
          </Grid2>
          {txt(mig.effort) && <p className="mt-3 text-[13px]"><span className="font-mono text-[11px] text-dim">EFFORT </span>{mig.effort}</p>}
        </>}
      </Box>

      <section>
        <Label>objection handling</Label>
        <ol className="mt-2 divide-y divide-line rounded border border-line">
          {arr(d.objections).map((o, i) => (
            <li key={i} className="grid gap-1 p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] md:gap-4">
              <p className="text-[13.5px] font-medium"><span className="font-mono text-down">“</span>{o.objection}<span className="font-mono text-down">”</span></p>
              <p className="text-[13.5px] text-fg/90"><span className="font-mono text-up">→ </span>{o.response}</p>
            </li>
          ))}
        </ol>
      </section>

      <Box title="landmine questions" tone="text-amber"><Bullets items={arr(d.landmines)} mark="?" tone="text-amber" /></Box>

      {sides.some((x) => arr(x.social_proof).length) && (
        <section>
          <Label>what customers say</Label>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            {sides.flatMap((x) => arr(x.social_proof).map((q, i) => (
              <blockquote key={x.name + i} className="rounded-sm bg-panel-2 px-3 py-2 text-[13px]">
                <span className="text-amber">“</span>{q.quote}<span className="text-amber">”</span>
                <span className="mt-1 block font-mono text-[11px] text-faint">{q.who} · {x.name}<SourceLink url={q.source_url} /></span>
              </blockquote>
            )))}
          </div>
        </section>
      )}

      {arr(d.proof_points).length > 0 && <Box title="proof points"><Bullets items={arr<Pt>(d.proof_points).map(sourced)} mark="§" /></Box>}
    </div>
  );
}
