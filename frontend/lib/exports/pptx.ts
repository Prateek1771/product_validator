// Slide deck: title, summary, methodology, one native (editable) chart per ChartSpec, data tables, actions, sources.
import { briefCharts, deliverableCharts, tablesFor, type ChartSpec, type TableSpec } from "../report-model";
import { PLAYBOOKS } from "../playbooks";
import type { Change, Report, Source } from "../types";

type Pptx = InstanceType<typeof import("pptxgenjs").default>;
type Slide = ReturnType<Pptx["addSlide"]>;

const INK = "111418", DIM = "5B6470", LINE = "D9DEE5", AMBER = "C27803";
const SERIES = ["C27803", "0A67A6", "2F8F5B", "8250DF", "C2410C", "5B6470"];
const FONT = "Calibri";
const W = 13.33;
const clip = (s: unknown, n = 160) => { const t = String(s ?? ""); return t.length > n ? t.slice(0, n - 1) + "…" : t; };
const fmt = (v: number) => (Math.abs(v) >= 1e9 ? `$${(v / 1e9).toFixed(1)}B` : Math.abs(v) >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${v.toLocaleString("en-US")}`);
// ponytail: linear white→amber blend, good enough for a 1-5 heatmap
const tint = (r: number) => [0xc2, 0x78, 0x03].map((c) => Math.round(255 - (255 - c) * Math.max(0, Math.min(1, r)) * 0.8).toString(16).padStart(2, "0")).join("");

function frame(p: Pptx, title: string, kicker?: string): Slide {
  const s = p.addSlide();
  s.background = { color: "FFFFFF" };
  s.addShape("rect", { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: AMBER } });
  if (kicker) s.addText(kicker.toUpperCase(), { x: 0.5, y: 0.3, w: 9, h: 0.3, fontFace: FONT, fontSize: 10, color: AMBER, bold: true, charSpacing: 2 });
  s.addText(title, { x: 0.5, y: 0.55, w: W - 1, h: 0.7, fontFace: FONT, fontSize: 24, bold: true, color: INK });
  s.addText("MKT·INTEL", { x: W - 2.3, y: 7.05, w: 1.9, h: 0.3, fontFace: FONT, fontSize: 9, color: DIM, align: "right" });
  return s;
}

const BOX = { x: 0.5, y: 1.4, w: W - 1, h: 5.5 };
const base = { fontFace: FONT, fontSize: 11, color: INK, chartColors: SERIES, catAxisLabelFontSize: 10, valAxisLabelFontSize: 10,
  catAxisLabelColor: DIM, valAxisLabelColor: DIM, valGridLine: { color: LINE, size: 0.5 }, legendFontSize: 10 };

// Excel-style number format: $3.4B / $1.2M / $1,234
const USD_FMT = '[>=1000000000]"$"0.0,,,"B";[>=1000000]"$"0.0,,"M";"$"#,##0';

function chart(p: Pptx, c: ChartSpec, kicker: string) {
  const s = frame(p, c.title, kicker);
  const C = p.ChartType;
  const usd = "unit" in c && c.unit === "usd" ? { valAxisLabelFormatCode: USD_FMT, dataLabelFormatCode: USD_FMT } : {};
  switch (c.kind) {
    case "bars": {
      const items = [...c.items].sort((a, b) => a.value - b.value); // bar charts draw bottom-up
      s.addChart(C.bar, [{ name: c.title, labels: items.map((i) => clip(i.label, 50)), values: items.map((i) => i.value) }],
        { ...BOX, ...base, ...usd, barDir: "bar", showValue: true, dataLabelFontSize: 10, chartColors: [AMBER] });
      break;
    }
    case "grouped":
      s.addChart(C.bar, c.series.map((x) => ({ name: x.name, labels: c.categories, values: x.values.map((v) => v ?? 0) })),
        { ...BOX, ...base, ...usd, barDir: "col", barGrouping: "clustered", showLegend: true, legendPos: "b" });
      break;
    case "scatter":
      s.addChart(C.scatter, [{ name: c.xLabel, values: c.points.map((q) => q.x) },
        { name: c.yLabel, values: c.points.map((q) => q.y), labels: c.points.map((q) => clip(q.label, 40)) }],
        { ...BOX, ...base, lineSize: 0, lineDataSymbolSize: 10, showLabel: true, dataLabelFormatScatter: "custom", dataLabelFontSize: 9,
          showCatAxisTitle: true, catAxisTitle: c.xLabel, showValAxisTitle: true, valAxisTitle: c.yLabel,
          ...(c.xMax ? { catAxisMaxVal: c.xMax, catAxisMinVal: 0 } : {}), ...(c.yMax ? { valAxisMaxVal: c.yMax, valAxisMinVal: 0 } : {}) });
      break;
    case "donut":
      s.addChart(C.doughnut, [{ name: c.title, labels: c.items.map((i) => i.label), values: c.items.map((i) => i.value) }],
        { ...BOX, ...base, holeSize: 55, showPercent: true, showLegend: true, legendPos: "r", dataLabelColor: "FFFFFF" });
      break;
    case "radar":
      s.addChart(C.radar, c.series.map((x) => ({ name: x.name, labels: c.axes, values: x.values })),
        { ...BOX, ...base, radarStyle: "marker", showLegend: true, legendPos: "b", ...(c.max ? { valAxisMaxVal: c.max, valAxisMinVal: 0 } : {}) });
      break;
    case "area":
      s.addChart(C.area, [{ name: c.title, labels: c.points.map((q) => q.x + (q.forecast ? "*" : "")), values: c.points.map((q) => q.y) }],
        { ...BOX, ...base, ...usd, chartColors: [AMBER], chartColorsOpacity: 60 });
      if (c.points.some((q) => q.forecast)) s.addText("* forecast", { x: 0.5, y: 6.95, w: 4, h: 0.3, fontFace: FONT, fontSize: 9, color: DIM });
      break;
    case "heatmap": {
      const max = c.max ?? Math.max(1, ...c.values.flat().map((v) => v ?? 0));
      const head = ["", ...c.cols].map((t) => ({ text: clip(t, 30), options: { bold: true, fill: { color: "F4F5F7" }, fontSize: 10 } }));
      const rows = c.rows.map((r, i) => [{ text: clip(r, 36), options: { bold: true, fontSize: 10 } },
        ...c.cols.map((_, j) => { const v = c.values[i]?.[j]; return { text: v == null ? "" : String(v), options: { align: "center" as const, fill: { color: v == null ? "FFFFFF" : tint(v / max) } } }; })]);
      s.addTable([head, ...rows.slice(0, 14)], { ...BOX, h: undefined, fontFace: FONT, fontSize: 11, color: INK, border: { type: "solid", color: LINE, pt: 0.5 }, valign: "middle" });
      break;
    }
    case "rings":
      c.levels.forEach((l, i) => {
        const x = 0.5 + i * ((W - 1) / c.levels.length), w = (W - 1) / c.levels.length - 0.3;
        s.addShape("roundRect", { x, y: 2, w, h: 3, fill: { color: i ? "FFFFFF" : "FDF4E3" }, line: { color: i ? LINE : AMBER, width: 1 }, rectRadius: 0.1 });
        s.addText([{ text: l.label + "\n", options: { fontSize: 14, bold: true, color: DIM } },
          { text: l.value == null ? "n/a" : fmt(l.value), options: { fontSize: 36, bold: true, color: AMBER } },
          ...(l.note ? [{ text: "\n" + l.note, options: { fontSize: 10, color: "B42318" } }] : [])],
          { x, y: 2, w, h: 3, align: "center", valign: "middle", fontFace: FONT });
      });
      break;
  }
}

function table(p: Pptx, t: TableSpec) {
  const cols = t.columns.slice(0, 7), per = 10;
  const cell = (v: unknown, j: number) => t.kinds?.[j] === "usd" && typeof v === "number" ? fmt(v) : t.kinds?.[j] === "pct" && typeof v === "number" ? `${v}%` : clip(v, 140);
  for (let i = 0; i < t.rows.length && i < per * 3; i += per) {
    const s = frame(p, t.name + (t.rows.length > per ? ` (${i / per + 1})` : ""), "data");
    const head = cols.map((c) => ({ text: c, options: { bold: true, fill: { color: "F4F5F7" } } }));
    const rows = t.rows.slice(i, i + per).map((r) => cols.map((_, j) => {
      const v = r[j], url = t.kinds?.[j] === "url" && typeof v === "string" && v.startsWith("http");
      return { text: url ? new URL(v).hostname.replace(/^www\./, "") : cell(v, j), options: url ? { hyperlink: { url: v }, color: "0A67A6" } : {} };
    }));
    s.addTable([head, ...rows], { x: 0.5, y: 1.4, w: W - 1, fontFace: FONT, fontSize: 10, color: INK, border: { type: "solid", color: LINE, pt: 0.5 }, valign: "top", autoPage: false });
  }
}

function bullets(s: Slide, items: string[], y = 1.4, h = 5.4) {
  s.addText(items.map((t) => ({ text: clip(t, 300), options: { bullet: { code: "25A0" }, paraSpaceAfter: 8 } })),
    { x: 0.5, y, w: W - 1, h, fontFace: FONT, fontSize: 15, color: INK, valign: "top" });
}

// already on their own slide as a heatmap or summary
const SKIP = new Set(["Summary", "Sources", "Matrix", "Scorecard"]);

export async function build(report: Report, changes: Change[], sources: Source[]): Promise<Blob> {
  const PptxGenJS = (await import("pptxgenjs")).default;
  const p = new PptxGenJS();
  p.layout = "LAYOUT_WIDE";
  p.title = report.title;
  p.company = "MKT·INTEL";
  const d = report.deliverable, m = report.methodology;
  const kind = PLAYBOOKS.find((x) => x.id === (d?.playbook ?? "brief"))?.label ?? "Report";

  // title
  const t = p.addSlide();
  t.background = { color: INK };
  t.addShape("rect", { x: 0.6, y: 2.2, w: 0.9, h: 0.08, fill: { color: AMBER } });
  t.addText(kind.toUpperCase(), { x: 0.6, y: 1.6, w: 10, h: 0.5, fontFace: FONT, fontSize: 14, bold: true, color: AMBER, charSpacing: 3 });
  t.addText(report.title, { x: 0.6, y: 2.5, w: W - 1.2, h: 2.2, fontFace: FONT, fontSize: 38, bold: true, color: "FFFFFF", valign: "top" });
  t.addText(`MKT·INTEL · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    { x: 0.6, y: 6.5, w: 10, h: 0.4, fontFace: FONT, fontSize: 12, color: "AEB6C2" });

  // summary + highlights
  const s = frame(p, "Executive summary", kind);
  const hs = (report.highlights ?? []).slice(0, 4);
  s.addText(clip(report.executive_summary, 900), { x: 0.5, y: 1.4, w: W - 1, h: hs.length ? 2.9 : 5.2, fontFace: FONT, fontSize: 15, color: INK, valign: "top" });
  hs.forEach((h, i) => {
    const w = (W - 1) / hs.length - 0.2, x = 0.5 + i * (w + 0.2);
    s.addShape("rect", { x, y: 4.6, w, h: 2, fill: { color: "FAFBFC" }, line: { color: LINE, width: 0.75 } });
    s.addText([{ text: clip(h.label, 40).toUpperCase() + "\n", options: { fontSize: 9, color: DIM, bold: true } },
      { text: clip(h.value, 24) + "\n", options: { fontSize: 26, bold: true, color: AMBER } },
      { text: clip(h.caption, 90), options: { fontSize: 10, color: DIM } }], { x: x + 0.15, y: 4.7, w: w - 0.3, h: 1.8, fontFace: FONT, valign: "top" });
  });
  if (report.why_it_matters) {
    bullets(frame(p, "Why it matters", kind), [report.why_it_matters]);
  }

  // methodology
  if (m) {
    const ms = frame(p, "How this was researched", "methodology");
    const stats: [string, string][] = [["Sources read", `${m.sources_read} / ${m.sources_found}`], ["Claims", String(m.claims)],
      ["Verified findings", `${m.verified} / ${m.findings}`], ["Research rounds", String(m.rounds)], ["Completeness", `${m.completeness}%`]];
    stats.forEach(([k, v], i) => ms.addText([{ text: k.toUpperCase() + "\n", options: { fontSize: 9, color: DIM, bold: true } }, { text: v, options: { fontSize: 22, bold: true, color: INK } }],
      { x: 0.5 + i * 2.45, y: 1.4, w: 2.3, h: 1, fontFace: FONT }));
    if (m.coverage.length) ms.addChart(p.ChartType.bar, [{ name: "coverage %", labels: m.coverage.map((c) => c.label), values: m.coverage.map((c) => c.pct) }],
      { x: 0.5, y: 2.7, w: 7, h: 4.2, ...base, barDir: "bar", chartColors: [AMBER], valAxisMaxVal: 100, valAxisMinVal: 0, showValue: true, showTitle: true, title: "Coverage per topic (%)", titleFontSize: 12 });
    const gaps = m.gaps.length ? m.gaps : ["No open gaps: every planned topic has sources."];
    ms.addText([{ text: "RESEARCH GAPS\n", options: { fontSize: 10, bold: true, color: AMBER } }, ...gaps.slice(0, 8).map((g) => ({ text: clip(g, 120), options: { bullet: true, fontSize: 12 } }))],
      { x: 7.8, y: 2.7, w: 5, h: 4.2, fontFace: FONT, color: INK, valign: "top" });
  }

  for (const c of [...(d ? deliverableCharts(d) : []), ...briefCharts(changes, m)]) chart(p, c, kind);
  for (const tb of tablesFor(report, changes, sources)) if (!SKIP.has(tb.name)) table(p, tb);

  if (report.recommended_actions?.length) bullets(frame(p, "Recommended next steps", "actions"), report.recommended_actions.slice(0, 8));

  const src = sources.slice(0, 40);
  for (let i = 0; i < src.length; i += 20) {
    const ss = frame(p, "Sources" + (src.length > 20 ? ` (${i / 20 + 1})` : ""), "appendix");
    ss.addText(src.slice(i, i + 20).map((x) => ({ text: clip(x.title || x.url, 110), options: { hyperlink: { url: x.url }, breakLine: true } })),
      { x: 0.5, y: 1.4, w: W - 1, h: 5.5, fontFace: FONT, fontSize: 11, color: "0A67A6", valign: "top", paraSpaceAfter: 3 });
  }

  return (await p.write({ outputType: "blob" })) as Blob;
}
