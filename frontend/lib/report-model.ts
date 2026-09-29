// One model of a report for every consumer: the on-screen views, the PDF page, the PPTX deck and the XLSX workbook.
// Charts and tables are derived from the stored deliverable, so the four outputs never drift.
import type { Battlecard, Change, CompetitorProfiles, CustomerPain, Deliverable, Landscape, MarketSizing, Methodology,
  Opportunity, PricingTeardown, Report, Source } from "./types";

export type Unit = "usd" | "pct" | "n";
export type ChartSpec =
  | { kind: "bars"; title: string; items: { label: string; value: number; note?: string }[]; unit?: Unit }
  | { kind: "grouped"; title: string; categories: string[]; series: { name: string; values: (number | null)[] }[]; unit?: Unit }
  | { kind: "scatter"; title: string; points: { label: string; x: number; y: number }[]; xLabel: string; yLabel: string;
      xMax?: number; yMax?: number; quadrants?: [string, string, string, string] }
  | { kind: "donut"; title: string; items: { label: string; value: number }[]; center?: string }
  | { kind: "radar"; title: string; axes: string[]; series: { name: string; values: number[] }[]; max?: number }
  | { kind: "area"; title: string; points: { x: string; y: number; forecast?: boolean }[]; unit?: Unit }
  | { kind: "heatmap"; title: string; rows: string[]; cols: string[]; values: (number | null)[][]; max?: number }
  | { kind: "rings"; title: string; levels: { label: string; value: number | null; note?: string }[] };

export type Cell = string | number | null;
export type TableSpec = { name: string; columns: string[]; rows: Cell[][]; kinds?: ("text" | "usd" | "pct" | "int" | "url")[] };

const arr = <T,>(x: T[] | null | undefined): T[] => (Array.isArray(x) ? x : []);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const has = (c: ChartSpec) =>
  c.kind === "bars" || c.kind === "donut" ? c.items.length > 0
  : c.kind === "grouped" ? c.series.some((s) => s.values.some((v) => v != null))
  : c.kind === "scatter" ? c.points.length > 0
  : c.kind === "radar" ? c.axes.length >= 3 && c.series.length > 0
  : c.kind === "area" ? c.points.length > 1
  : c.kind === "heatmap" ? c.rows.length > 0 && c.cols.length > 0
  : c.levels.some((l) => l.value != null);

// ---------- charts ----------
export function briefCharts(changes: Change[], m?: Methodology | null): ChartSpec[] {
  const types: Record<string, number> = {};
  for (const c of changes) if (c.change_type) types[c.change_type] = (types[c.change_type] ?? 0) + 1;
  const out: ChartSpec[] = [
    { kind: "scatter", title: "Findings: impact vs confidence", xLabel: "impact", yLabel: "confidence", xMax: 100, yMax: 100,
      points: changes.filter((c) => c.impact_score != null && c.confidence != null)
        .map((c) => ({ label: c.company ? `${c.company}: ${c.title}` : c.title, x: c.impact_score!, y: c.confidence! })),
      quadrants: ["check the evidence", "act now", "ignore", "watch closely"] },
    { kind: "bars", title: "Findings by type", items: Object.entries(types).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })) },
  ];
  if (m) out.push({ kind: "donut", title: "Where the evidence came from", center: String(m.sources_found),
    items: Object.entries(m.source_mix).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })) });
  return out.filter(has);
}

export function deliverableCharts(d: Deliverable): ChartSpec[] {
  const out: ChartSpec[] = [];
  if (d.playbook === "profile") {
    const x: CompetitorProfiles = d.data, cos = arr(x.companies);
    const pm = x.positioning_map;
    if (pm) out.push({ kind: "scatter", title: "Positioning map", xLabel: pm.x_axis, yLabel: pm.y_axis, points: arr(pm.points).map((p) => ({ label: p.name, x: p.x, y: p.y })) });
    const dims = [...new Set(cos.flatMap((c) => arr(c.scorecard).map((s) => s.dimension)))];
    out.push({ kind: "heatmap", title: "Scorecard (1-5)", rows: cos.map((c) => c.name), cols: dims,
      values: cos.map((c) => dims.map((dim) => arr(c.scorecard).find((s) => s.dimension === dim)?.score ?? null)) });
    out.push(priceLadder("Price ladder (monthly)", cos.map((c) => ({ name: c.name, tiers: arr(c.pricing?.tiers) }))));
  } else if (d.playbook === "pricing") {
    const x: PricingTeardown = d.data, cos = arr(x.companies);
    out.push(priceLadder("Price ladder (monthly)", cos.map((c) => ({ name: c.name, tiers: arr(c.tiers) }))));
    out.push({ kind: "grouped", title: "Cost scenarios (per month)", unit: "usd", categories: arr(x.cost_scenarios).map((r) => r.dimension),
      series: cos.map((c, i) => ({ name: c.name, values: arr(x.cost_scenarios).map((r) => num(arr(r.amounts_usd)[i])) })) });
    out.push({ kind: "grouped", title: "Pricing page checks passed", categories: cos.map((c) => c.name), series: [
      { name: "Human buyer (of 6)", values: cos.map((c) => arr(c.rubric_human).filter((v) => v.verdict === "pass").length) },
      { name: "AI agent (of 4)", values: cos.map((c) => arr(c.rubric_agent).filter((v) => v.verdict === "pass").length) }] });
  } else if (d.playbook === "battlecard") {
    const x: Battlecard = d.data, rs = arr(x.ratings);
    out.push({ kind: "radar", title: "Ratings (1-5)", axes: rs.map((r) => r.dimension), max: 5,
      series: [{ name: x.subject, values: rs.map((r) => r.subject) }, { name: x.competitor, values: rs.map((r) => r.competitor) }] });
  } else if (d.playbook === "landscape") {
    const x: Landscape = d.data, m = x.matrix;
    if (m) out.push({ kind: "heatmap", title: "Competitor matrix (1-5)", rows: arr(m.rows).map((r) => r.company), cols: arr(m.dimensions),
      values: arr(m.rows).map((r) => arr(m.dimensions).map((_, j) => num(arr(r.scores)[j]))) });
    out.push({ kind: "bars", title: "Companies by stage", items: arr(x.stage_counts).filter((s) => s.count).map((s) => ({ label: s.stage, value: s.count })) });
    out.push({ kind: "bars", title: "Companies per category", items: arr(x.categories).map((c) => ({ label: c.name, value: arr(c.companies).length })) });
  } else if (d.playbook === "pain") {
    const x: CustomerPain = d.data, sp = x.sentiment_pct ?? x.sentiment;
    const read = arr(x.themes).reduce((n, t) => n + t.mentions, 0), counted = x.sentiment ? x.sentiment.positive + x.sentiment.neutral + x.sentiment.negative : 0;
    const basis = x.sentiment_basis ?? (counted > 3 * read ? "ratings" : "mentions");
    out.push({ kind: "bars", title: "Share of complaints", unit: "pct",
      items: arr(x.themes).map((t) => ({ label: t.theme, value: t.share_pct ?? t.mentions, note: `severity ${t.severity}/5` })) });
    if (sp) out.push({ kind: "donut", title: basis === "ratings" ? "Overall rating sentiment (platform totals)" : "Sentiment of mentions read", items: [
      { label: "negative", value: sp.negative }, { label: "neutral", value: sp.neutral }, { label: "positive", value: sp.positive }] });
    out.push({ kind: "bars", title: "Feature requests (mentions)", items: arr(x.feature_requests).map((f) => ({ label: f.request, value: f.mentions })) });
  } else if (d.playbook === "sizing") {
    const x: MarketSizing = d.data;
    const lv = (k: "tam" | "sam" | "som") => x[k] && ({ label: k.toUpperCase(), value: num(x[k].computed_usd) ?? num(x[k].value_usd),
      note: x[k].check === "mismatch" ? "stated value differs from inputs" : undefined });
    out.push({ kind: "rings", title: "TAM, SAM and SOM (per year)", levels: (["tam", "sam", "som"] as const).map(lv).filter(Boolean) as { label: string; value: number | null }[] });
    out.push({ kind: "area", title: `Market size by year${x.growth?.cagr_pct != null ? ` (CAGR ${x.growth.cagr_pct}%)` : ""}`, unit: "usd",
      points: arr(x.growth?.points).map((p) => ({ x: String(p.year), y: p.value_usd, forecast: p.forecast })) });
    out.push({ kind: "bars", title: "Scenarios", unit: "usd", items: arr(x.scenarios).map((s) => ({ label: `${s.case} (${s.year})`, value: s.value_usd })) });
  } else if (d.playbook === "opportunity") {
    const x: Opportunity = d.data;
    out.push({ kind: "scatter", title: "Segments: competition vs demand", xLabel: "competition", yLabel: "demand", xMax: 10, yMax: 10,
      quadrants: ["sweet spot", "crowded but wanted", "quiet niche", "avoid"],
      points: arr(x.segments).map((s) => ({ label: s.segment, x: s.competition, y: s.demand })) });
    const cells: (number | null)[][] = [5, 4, 3, 2, 1].map((imp) => [1, 2, 3, 4, 5].map((lik) => arr(x.risks).filter((r) => r.impact === imp && r.likelihood === lik).length || null));
    out.push({ kind: "heatmap", title: "Risk matrix (count of risks)", rows: ["impact 5", "impact 4", "impact 3", "impact 2", "impact 1"],
      cols: ["likelihood 1", "2", "3", "4", "5"], values: cells, max: Math.max(1, ...cells.flat().map((v) => v ?? 0)) });
    out.push({ kind: "bars", title: "Competitors to watch (threat 1-5)", items: arr(x.competitors_to_watch).map((w) => ({ label: w.name, value: w.threat })) });
  }
  return out.filter(has);
}

function priceLadder(title: string, cos: { name: string; tiers: { name: string; monthly_usd?: number | null }[] }[]): ChartSpec {
  const n = Math.max(0, ...cos.map((c) => c.tiers.filter((t) => num(t.monthly_usd) != null).length));
  const priced = cos.map((c) => c.tiers.filter((t) => num(t.monthly_usd) != null).sort((a, b) => a.monthly_usd! - b.monthly_usd!));
  return { kind: "grouped", title, unit: "usd", categories: Array.from({ length: Math.min(n, 5) }, (_, i) => `tier ${i + 1}`),
    series: cos.map((c, i) => ({ name: c.name, values: Array.from({ length: Math.min(n, 5) }, (_, j) => num(priced[i][j]?.monthly_usd)) })) };
}

// ---------- tables (Excel sheets, deck tables, PDF appendix) ----------
export function tablesFor(r: Report, changes: Change[], sources: Source[]): TableSpec[] {
  const t: TableSpec[] = [];
  const m = r.methodology;
  t.push({ name: "Summary", columns: ["Field", "Value"], rows: [
    ["Title", r.title], ["Executive summary", r.executive_summary], ["Why it matters", r.why_it_matters],
    ...arr(r.recommended_actions).map((a, i) => [`Action ${i + 1}`, a] as Cell[]),
    ...arr(r.highlights).map((h) => [h.label, `${h.value} (${h.caption})`] as Cell[]),
    ...(m ? [["Sources read", `${m.sources_read} of ${m.sources_found}`], ["Claims", m.claims], ["Verified findings", `${m.verified} of ${m.findings}`],
      ["Research rounds", m.rounds], ["Completeness", `${m.completeness}%`]] as Cell[][] : []),
  ] });
  const d = r.deliverable;
  if (d?.playbook === "profile") {
    const cos = arr(d.data.companies);
    t.push({ name: "Comparison", columns: ["Dimension", ...cos.map((c) => c.name)], rows: arr(d.data.comparison).map((row) => [row.dimension, ...cos.map((_, i) => arr(row.values)[i] ?? "")]) });
    t.push({ name: "Tiers", columns: ["Company", "Tier", "Price", "Monthly USD", "Includes"], kinds: ["text", "text", "text", "usd", "text"],
      rows: cos.flatMap((c) => arr(c.pricing?.tiers).map((x) => [c.name, x.name, x.price, num(x.monthly_usd), arr(x.inclusions).join("; ")])) });
    t.push({ name: "Scorecard", columns: ["Company", "Dimension", "Score", "Note"], kinds: ["text", "text", "int", "text"],
      rows: cos.flatMap((c) => arr(c.scorecard).map((s) => [c.name, s.dimension, s.score, s.note])) });
    t.push({ name: "Strengths & weaknesses", columns: ["Company", "Kind", "Point", "Source"], kinds: ["text", "text", "text", "url"],
      rows: cos.flatMap((c) => [...arr(c.strengths).map((s) => [c.name, "strength", s.point, s.source_url]), ...arr(c.weaknesses).map((s) => [c.name, "weakness", s.point, s.source_url])]) });
  } else if (d?.playbook === "pricing") {
    const cos = arr(d.data.companies), names = cos.map((c) => c.name);
    t.push({ name: "Comparison", columns: ["Dimension", ...names], rows: arr(d.data.comparison).map((row) => [row.dimension, ...names.map((_, i) => arr(row.values)[i] ?? "")]) });
    t.push({ name: "Tiers", columns: ["Company", "Tier", "Price", "Monthly USD", "Billing", "Limits", "Anchor"], kinds: ["text", "text", "text", "usd", "text", "text", "text"],
      rows: cos.flatMap((c) => arr(c.tiers).map((x) => [c.name, x.name, x.price, num(x.monthly_usd), x.billing, x.limits, x.is_anchor ? "yes" : ""])) });
    t.push({ name: "Cost scenarios", columns: ["Scenario", ...names.flatMap((n) => [n, `${n} USD/mo`])], kinds: ["text", ...names.flatMap(() => ["text", "usd"] as const)],
      rows: arr(d.data.cost_scenarios).map((row) => [row.dimension, ...names.flatMap((_, i) => [arr(row.values)[i] ?? "", num(arr(row.amounts_usd)[i])])]) });
    t.push({ name: "Page rubric", columns: ["Company", "Axis", "Dimension", "Verdict", "Note"],
      rows: cos.flatMap((c) => [...arr(c.rubric_human).map((v) => [c.name, "human", v.dimension, v.verdict, v.note]), ...arr(c.rubric_agent).map((v) => [c.name, "agent", v.dimension, v.verdict, v.note])]) });
  } else if (d?.playbook === "battlecard") {
    const x = d.data;
    t.push({ name: "Features", columns: ["Category", "Feature", x.subject, x.competitor], rows: arr(x.features).map((f) => [f.category ?? "", f.feature, f.subject, f.competitor]) });
    t.push({ name: "Ratings", columns: ["Dimension", x.subject, x.competitor, "Note"], kinds: ["text", "int", "int", "text"], rows: arr(x.ratings).map((r2) => [r2.dimension, r2.subject, r2.competitor, r2.note]) });
    t.push({ name: "Objections", columns: ["Objection", "Response"], rows: arr(x.objections).map((o) => [o.objection, o.response]) });
  } else if (d?.playbook === "landscape") {
    const x = d.data;
    t.push({ name: "Market map", columns: ["Category", "Company", "Stage", "Domain", "One-liner"], rows: arr(x.categories).flatMap((c) => arr(c.companies).map((co) => [c.name, co.name, co.stage, co.domain, co.one_liner])) });
    t.push({ name: "Matrix", columns: ["Company", ...arr(x.matrix?.dimensions)], kinds: ["text", ...arr(x.matrix?.dimensions).map(() => "int" as const)],
      rows: arr(x.matrix?.rows).map((r2) => [r2.company, ...arr(r2.scores)]) });
    t.push({ name: "SWOT", columns: ["Kind", "Point"], rows: (["strengths", "weaknesses", "opportunities", "threats"] as const).flatMap((k) => arr(x.swot?.[k]).map((p) => [k, p])) });
    t.push({ name: "Trends", columns: ["Trend", "Direction", "Evidence", "Source"], kinds: ["text", "text", "text", "url"], rows: arr(x.trends).map((tr) => [tr.trend, tr.direction, tr.evidence, tr.source_url]) });
  } else if (d?.playbook === "pain") {
    const x = d.data;
    t.push({ name: "Themes", columns: ["Theme", "Share %", "Mentions", "Severity", "Sentiment", "Summary"], kinds: ["text", "pct", "int", "int", "text", "text"],
      rows: arr(x.themes).map((th) => [th.theme, num(th.share_pct), th.mentions, th.severity, th.sentiment, th.summary]) });
    t.push({ name: "Quotes", columns: ["Theme", "Quote", "Where", "Source"], kinds: ["text", "text", "text", "url"], rows: arr(x.themes).flatMap((th) => arr(th.quotes).map((q) => [th.theme, q.quote, q.where, q.source_url])) });
    t.push({ name: "Feature requests", columns: ["Request", "Mentions"], kinds: ["text", "int"], rows: arr(x.feature_requests).map((f) => [f.request, f.mentions]) });
    t.push({ name: "Opportunity gaps", columns: ["Gap", "Evidence", "Idea"], rows: arr(x.opportunity_gaps).map((g) => [g.gap, g.evidence, g.idea]) });
  } else if (d?.playbook === "sizing") {
    const x = d.data;
    t.push({ name: "Sizing", columns: ["Level", "Computed USD", "Stated USD", "Check", "Method"], kinds: ["text", "usd", "usd", "text", "text"],
      rows: (["tam", "sam", "som"] as const).map((k) => [k.toUpperCase(), num(x[k]?.computed_usd), num(x[k]?.value_usd), x[k]?.check ?? "", x[k]?.method ?? ""]) });
    t.push({ name: "Inputs", columns: ["Level", "Input", "Value", "Unit", "Source"], kinds: ["text", "text", "text", "text", "url"],
      rows: (["tam", "sam", "som"] as const).flatMap((k) => arr(x[k]?.inputs).map((i) => [k.toUpperCase(), i.label, i.value, i.unit, i.source_url])) });
    t.push({ name: "Growth", columns: ["Year", "Market USD", "Forecast", "Source"], kinds: ["int", "usd", "text", "url"],
      rows: arr(x.growth?.points).map((p) => [p.year, p.value_usd, p.forecast ? "yes" : "", p.source_url]) });
    t.push({ name: "Scenarios", columns: ["Case", "Year", "Market USD", "Assumption"], kinds: ["text", "int", "usd", "text"], rows: arr(x.scenarios).map((s) => [s.case, s.year, s.value_usd, s.assumption]) });
  } else if (d?.playbook === "opportunity") {
    const x = d.data;
    t.push({ name: "Segments", columns: ["Segment", "Need", "Demand", "Competition", "Score", "Evidence", "Source"], kinds: ["text", "text", "int", "int", "int", "text", "url"],
      rows: arr(x.segments).map((s) => [s.segment, s.need, s.demand, s.competition, num(s.score), s.evidence, s.source_url]) });
    t.push({ name: "Risks", columns: ["Risk", "Likelihood", "Impact", "Mitigation"], kinds: ["text", "int", "int", "text"], rows: arr(x.risks).map((k) => [k.risk, k.likelihood, k.impact, k.mitigation]) });
    t.push({ name: "Gaps", columns: ["Gap", "Target user", "Why now", "Evidence"], rows: arr(x.gaps).map((g) => [g.gap, g.target_user, g.why_now, g.evidence]) });
  }
  t.push({ name: "Findings", columns: ["Company", "Finding", "Type", "Impact", "Confidence", "Action", "Verified", "Date"], kinds: ["text", "text", "text", "int", "int", "text", "text", "text"],
    rows: changes.map((c) => [c.company, c.title, c.change_type ?? "", num(c.impact_score), num(c.confidence), c.recommended_action ?? "", c.is_real_change ? "yes" : "no", c.published_at]) });
  t.push({ name: "Sources", columns: ["Title", "URL", "Type", "Provider"], kinds: ["text", "url", "text", "text"], rows: sources.map((s) => [s.title, s.url, s.type, s.provider ?? ""]) });
  return t.filter((x) => x.rows.length);
}
