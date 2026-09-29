// Chart primitives for reports: plain SVG/HTML on the theme tokens, no dependency, print-safe, no animation.
import type { ChartSpec, Unit } from "@/lib/report-model";
// Every chart is a <figure role="img"> with an aria-label and a visually hidden data table.

export const SERIES = ["var(--amber)", "var(--info)", "var(--up)", "var(--violet)", "var(--down)", "var(--dim)"];

export function money(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "-";
  const a = Math.abs(v);
  for (const [n, s] of [[1e12, "T"], [1e9, "B"], [1e6, "M"], [1e3, "K"]] as const) if (a >= n) return `$${(v / n).toFixed(1)}${s}`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
const plain = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
type Fmt = (v: number) => string;

function Frame({ title, label, table, children, className = "" }: {
  title: string; label: string; table: (string | number)[][]; children: React.ReactNode; className?: string;
}) {
  return (
    <figure className={`chart rounded border border-line p-4 ${className}`} role="img" aria-label={label}>
      <figcaption className="label">{title}</figcaption>
      <div className="mt-3" aria-hidden>{children}</div>
      <div className="sr-only">
        <table><tbody>{table.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody></table>
      </div>
    </figure>
  );
}

export function Legend({ names }: { names: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-dim">
      {names.map((n, i) => <span key={n} className="inline-flex items-center gap-1.5"><span className="size-2 rounded-[2px]" style={{ background: SERIES[i % SERIES.length] }} />{n}</span>)}
    </div>
  );
}

/** Horizontal bars, sorted as given. No background track: the bar length is the data. */
export function Bars({ title, items, format = plain, color = SERIES[0] }: {
  title: string; items: { label: string; value: number; note?: string }[]; format?: Fmt; color?: string;
}) {
  const max = Math.max(1e-9, ...items.map((i) => i.value));
  return (
    <Frame title={title} label={`${title}: ` + items.map((i) => `${i.label} ${format(i.value)}`).join(", ")} table={items.map((i) => [i.label, format(i.value)])}>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.label} className="grid grid-cols-[minmax(0,40%)_1fr] items-center gap-3 text-[12.5px]">
            <span className="truncate" title={i.label}>{i.label}</span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 rounded-[2px]" style={{ width: `${Math.max(2, (i.value / max) * 100)}%`, background: color }} />
              <span className="shrink-0 font-mono text-[11px] text-dim">{format(i.value)}{i.note && <span className="text-faint"> {i.note}</span>}</span>
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

/** Vertical grouped bars: one group per category, one bar per series. Null values are skipped. */
export function GroupedBars({ title, categories, series, format = plain }: {
  title: string; categories: string[]; series: { name: string; values: (number | null)[] }[]; format?: Fmt;
}) {
  const vals = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const max = Math.max(1e-9, ...vals);
  const W = 100 * categories.length, H = 60, gw = 100, bw = Math.min(18, 70 / Math.max(1, series.length));
  return (
    <Frame title={title} label={`${title}. ` + categories.map((c, ci) => `${c}: ` + series.map((s) => `${s.name} ${s.values[ci] == null ? "n/a" : format(s.values[ci]!)}`).join(", ")).join("; ")}
           table={[["", ...series.map((s) => s.name)], ...categories.map((c, ci) => [c, ...series.map((s) => (s.values[ci] == null ? "-" : format(s.values[ci]!)))])]}>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" style={{ maxHeight: 260 }}>
        <line x1="0" y1={H} x2={W} y2={H} className="stroke-line-2" strokeWidth="0.4" />
        {categories.map((c, ci) => {
          const x0 = ci * gw + (gw - bw * series.length) / 2;
          return (
            <g key={c}>
              {series.map((s, si) => {
                const v = s.values[ci];
                if (v == null) return null;
                const h = Math.max(0.6, (v / max) * (H - 8));
                return (
                  <g key={s.name}>
                    <rect x={x0 + si * bw} y={H - h} width={bw - 1.5} height={h} rx="0.6" style={{ fill: SERIES[si % SERIES.length] }} />
                    <text x={x0 + si * bw + (bw - 1.5) / 2} y={H - h - 1.5} textAnchor="middle" className="fill-dim font-mono" fontSize="3.2">{format(v)}</text>
                  </g>
                );
              })}
              <text x={ci * gw + gw / 2} y={H + 6} textAnchor="middle" className="fill-fg" fontSize="3.8">{c.length > 26 ? c.slice(0, 25) + "…" : c}</text>
            </g>
          );
        })}
      </svg>
      {series.length > 1 && <Legend names={series.map((s) => s.name)} />}
    </Frame>
  );
}

/** Scatter on 0..max axes, optional quadrant labels (top-left, top-right, bottom-left, bottom-right). */
export function Scatter({ title, points, xLabel, yLabel, xMax = 100, yMax = 100, quadrants }: {
  title: string; points: { label: string; x: number; y: number; color?: string }[];
  xLabel: string; yLabel: string; xMax?: number; yMax?: number; quadrants?: [string, string, string, string];
}) {
  const px = (x: number) => (Math.max(0, Math.min(xMax, x)) / xMax) * 100;
  const py = (y: number) => 100 - (Math.max(0, Math.min(yMax, y)) / yMax) * 100;
  return (
    <Frame title={title} label={`${title}, ${xLabel} by ${yLabel}: ` + points.map((p) => `${p.label} (${plain(p.x)}, ${plain(p.y)})`).join("; ")}
           table={[["", xLabel, yLabel], ...points.map((p) => [p.label, plain(p.x), plain(p.y)])]}>
      <p className="font-mono text-[11px] text-dim">↑ {yLabel}</p>
      <svg viewBox="-2 -2 104 104" className="mt-1 w-full max-w-[520px]">
        <rect x="0" y="0" width="100" height="100" className="fill-panel-2 stroke-line" strokeWidth="0.4" />
        <line x1="50" y1="0" x2="50" y2="100" className="stroke-line-2" strokeWidth="0.3" strokeDasharray="1.5 1.5" />
        <line x1="0" y1="50" x2="100" y2="50" className="stroke-line-2" strokeWidth="0.3" strokeDasharray="1.5 1.5" />
        {quadrants && ([[3, 5, "start"], [97, 5, "end"], [3, 97, "start"], [97, 97, "end"]] as const).map(([x, y, a], i) => (
          <text key={i} x={x} y={y} textAnchor={a} className="fill-faint font-mono" fontSize="3">{quadrants[i]}</text>
        ))}
        {points.map((p, i) => {
          // ponytail: points on the same spot fan out sideways; a force layout if dense scatters ever need it
          const dup = points.slice(0, i).filter((q) => Math.abs(px(q.x) - px(p.x)) < 4 && Math.abs(py(q.y) - py(p.y)) < 4).length;
          const x = Math.min(97, px(p.x) + dup * 4.5), y = py(p.y);
          return (
            <g key={p.label + i}>
              <circle cx={x} cy={y} r="2.6" style={{ fill: p.color ?? SERIES[i % SERIES.length] }} />
              <text x={x} y={y + 1.1} textAnchor="middle" className="font-mono" style={{ fill: "var(--bg)" }} fontSize="3" fontWeight="700">{i + 1}</text>
            </g>
          );
        })}
      </svg>
      <p className="mt-1 max-w-[520px] text-right font-mono text-[11px] text-dim">{xLabel} →</p>
      <ol className="mt-2 grid max-w-[520px] gap-y-1 text-[12px]">
        {points.map((p, i) => (
          <li key={p.label + i} className="flex min-w-0 gap-1.5">
            <span className="font-mono font-semibold" style={{ color: p.color ?? SERIES[i % SERIES.length] }}>{i + 1}</span>
            <span className="min-w-0 truncate" title={p.label}>{p.label}</span>
            <span className="ml-auto shrink-0 font-mono text-[10.5px] text-faint">{plain(p.x)}, {plain(p.y)}</span>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

/** Donut with a centre label. */
export function Donut({ title, items, center, format = plain }: {
  title: string; items: { label: string; value: number; color?: string }[]; center?: string; format?: Fmt;
}) {
  const total = items.reduce((a, i) => a + Math.max(0, i.value), 0) || 1;
  const starts = items.map((_, k) => items.slice(0, k).reduce((a, x) => a + Math.max(0, x.value), 0));
  const arc = (a0: number, a1: number) => {
    const p = (a: number, r: number) => [50 + r * Math.sin(2 * Math.PI * a), 50 - r * Math.cos(2 * Math.PI * a)];
    const [x0, y0] = p(a0, 40), [x1, y1] = p(a1, 40), [x2, y2] = p(a1, 26), [x3, y3] = p(a0, 26), big = a1 - a0 > 0.5 ? 1 : 0;
    return `M${x0} ${y0} A40 40 0 ${big} 1 ${x1} ${y1} L${x2} ${y2} A26 26 0 ${big} 0 ${x3} ${y3} Z`;
  };
  return (
    <Frame title={title} label={`${title}: ` + items.map((i) => `${i.label} ${Math.round((100 * i.value) / total)}%`).join(", ")}
           table={items.map((i) => [i.label, format(i.value), `${Math.round((100 * i.value) / total)}%`])}>
      <div className="flex flex-wrap items-center gap-5">
        <svg viewBox="0 0 100 100" className="size-36 shrink-0">
          {items.map((i, k) => {
            const a0 = starts[k] / total, a1 = Math.min(0.9999, (starts[k] + Math.max(0, i.value)) / total);
            return a1 > a0 ? <path key={i.label} d={arc(a0, a1)} style={{ fill: i.color ?? SERIES[k % SERIES.length] }} /> : null;
          })}
          {center && <text x="50" y="53" textAnchor="middle" className="fill-fg font-mono" fontSize="9" fontWeight="600">{center}</text>}
        </svg>
        <ul className="space-y-1 font-mono text-[11.5px]">
          {items.map((i, k) => (
            <li key={i.label} className="flex items-center gap-2">
              <span className="size-2 rounded-[2px]" style={{ background: i.color ?? SERIES[k % SERIES.length] }} />
              <span className="text-fg">{i.label}</span><span className="text-dim">{Math.round((100 * i.value) / total)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}

/** Radar across axes, one polygon per series, 0..max. */
export function Radar({ title, axes, series, max = 5 }: { title: string; axes: string[]; series: { name: string; values: number[] }[]; max?: number }) {
  const n = axes.length;
  const pt = (i: number, r: number) => [50 + r * Math.sin((2 * Math.PI * i) / n), 50 - r * Math.cos((2 * Math.PI * i) / n)];
  return (
    <Frame title={title} label={`${title}. ` + series.map((s) => `${s.name}: ` + axes.map((a, i) => `${a} ${s.values[i] ?? "-"}`).join(", ")).join("; ")}
           table={[["", ...series.map((s) => s.name)], ...axes.map((a, i) => [a, ...series.map((s) => s.values[i] ?? "-")])]}>
      <svg viewBox="-22 -8 144 116" className="w-full max-w-[460px]">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={axes.map((_, i) => pt(i, 38 * f).join(",")).join(" ")} className="fill-none stroke-line" strokeWidth="0.3" />
        ))}
        {axes.map((a, i) => {
          const [x, y] = pt(i, 38), [lx, ly] = pt(i, 45);
          return (
            <g key={a}>
              <line x1="50" y1="50" x2={x} y2={y} className="stroke-line" strokeWidth="0.3" />
              <text x={lx} y={ly + 1.2} textAnchor={Math.abs(lx - 50) < 4 ? "middle" : lx > 50 ? "start" : "end"} className="fill-dim" fontSize="3.4">{a}</text>
            </g>
          );
        })}
        {series.map((s, si) => (
          <polygon key={s.name} points={axes.map((_, i) => pt(i, (38 * Math.max(0, Math.min(max, s.values[i] ?? 0))) / max).join(",")).join(" ")}
                   style={{ fill: SERIES[si % SERIES.length], fillOpacity: 0.18, stroke: SERIES[si % SERIES.length] }} strokeWidth="0.8" />
        ))}
      </svg>
      <Legend names={series.map((s) => s.name)} />
    </Frame>
  );
}

/** Area/line over ordered points; forecast points are drawn dashed. */
export function Area({ title, points, format = plain }: { title: string; points: { x: string; y: number; forecast?: boolean }[]; format?: Fmt }) {
  if (!points.length) return null;
  const max = Math.max(1e-9, ...points.map((p) => p.y)), W = 100, H = 50;
  const xy = points.map((p, i) => [points.length === 1 ? W / 2 : (i / (points.length - 1)) * W, H - (p.y / max) * (H - 6)] as const);
  const firstF = points.findIndex((p) => p.forecast);
  const path = (from: number, to: number) => xy.slice(from, to).map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const hist = firstF === -1 ? xy.length : Math.max(1, firstF);
  return (
    <Frame title={title} label={`${title}: ` + points.map((p) => `${p.x} ${format(p.y)}${p.forecast ? " forecast" : ""}`).join(", ")}
           table={points.map((p) => [p.x, format(p.y), p.forecast ? "forecast" : "actual"])}>
      <svg viewBox={`-2 -4 ${W + 4} ${H + 14}`} className="w-full" style={{ maxHeight: 240 }}>
        <path d={`${path(0, xy.length)} L${xy[xy.length - 1][0]} ${H} L${xy[0][0]} ${H} Z`} style={{ fill: SERIES[0], fillOpacity: 0.1 }} />
        <path d={path(0, hist)} fill="none" style={{ stroke: SERIES[0] }} strokeWidth="0.8" />
        {firstF !== -1 && <path d={path(hist - 1, xy.length)} fill="none" style={{ stroke: SERIES[0] }} strokeWidth="0.8" strokeDasharray="1.8 1.4" />}
        {xy.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="1" style={{ fill: SERIES[0] }} />
            <text x={x} y={y - 2.2} textAnchor="middle" className="fill-dim font-mono" fontSize="2.8">{format(points[i].y)}</text>
            <text x={x} y={H + 6} textAnchor="middle" className="fill-fg font-mono" fontSize="3">{points[i].x}</text>
          </g>
        ))}
      </svg>
      {firstF !== -1 && <p className="font-mono text-[11px] text-faint">dashed = forecast</p>}
    </Frame>
  );
}

/** Heatmap grid: cell shade scales with value / max. */
export function Heatmap({ title, rows, cols, values, max = 5, format = plain }: {
  title: string; rows: string[]; cols: string[]; values: (number | null)[][]; max?: number; format?: Fmt;
}) {
  return (
    <Frame title={title} label={`${title}. ` + rows.map((r, i) => `${r}: ` + cols.map((c, j) => `${c} ${values[i]?.[j] ?? "-"}`).join(", ")).join("; ")}
           table={[["", ...cols], ...rows.map((r, i) => [r, ...cols.map((_, j) => values[i]?.[j] ?? "-")])]}>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-separate border-spacing-[3px] text-[12px]" style={{ minWidth: 140 + 72 * cols.length }}>
          <thead><tr><th style={{ width: 140 }} />{cols.map((c) => <th key={c} scope="col" className="px-1 pb-1 text-left align-bottom font-mono text-[10.5px] font-medium text-dim">{c}</th>)}</tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r}>
                <th scope="row" className="truncate pr-2 text-left font-medium" title={r}>{r}</th>
                {cols.map((c, j) => {
                  const v = values[i]?.[j];
                  const pct = v == null ? 0 : Math.round(12 + 70 * Math.max(0, Math.min(1, v / max)));
                  return (
                    <td key={c} className="h-8 rounded-[3px] text-center font-mono text-[11.5px]"
                        style={{ background: v == null ? "var(--panel-2)" : `color-mix(in srgb, var(--amber) ${pct}%, var(--panel))`, color: pct > 55 ? "var(--amber-ink)" : "var(--fg)" }}>
                      {v == null ? "-" : format(v)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}

/** Nested rings (TAM ⊃ SAM ⊃ SOM), area proportional to value. */
export function Rings({ title, levels }: { title: string; levels: { label: string; value: number | null; note?: string }[] }) {
  const top = Math.max(1e-9, ...levels.map((l) => l.value ?? 0));
  return (
    <Frame title={title} label={`${title}: ` + levels.map((l) => `${l.label} ${money(l.value)}`).join(", ")} table={levels.map((l) => [l.label, money(l.value)])}>
      <div className="flex flex-wrap items-center gap-6">
        <svg viewBox="0 0 100 100" className="size-44 shrink-0">
          {levels.map((l, i) => {
            const r = Math.max(6, 46 * Math.sqrt((l.value ?? 0) / top));
            return <circle key={l.label} cx="50" cy={96 - r} r={r} style={{ fill: SERIES[0], fillOpacity: 0.14 + i * 0.22, stroke: SERIES[0] }} strokeWidth="0.5" />;
          })}
        </svg>
        <dl className="space-y-2">
          {levels.map((l) => (
            <div key={l.label}>
              <dt className="label">{l.label}</dt>
              <dd className="font-mono text-lg font-semibold text-amber">{money(l.value)}{l.note && <span className="ml-2 align-middle font-sans text-[11px] font-normal text-down">{l.note}</span>}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Frame>
  );
}

const FMT: Record<Unit, Fmt> = { usd: (v) => money(v), pct: (v) => `${plain(v)}%`, n: plain };

/** Renders any ChartSpec from lib/report-model. */
export function ChartView({ spec: c }: { spec: ChartSpec }) {
  switch (c.kind) {
    case "bars": return <Bars title={c.title} items={c.items} format={FMT[c.unit ?? "n"]} />;
    case "grouped": return <GroupedBars title={c.title} categories={c.categories} series={c.series} format={FMT[c.unit ?? "n"]} />;
    case "scatter": return <Scatter {...c} />;
    case "donut": return <Donut title={c.title} items={c.items} center={c.center} />;
    case "radar": return <Radar title={c.title} axes={c.axes} series={c.series} max={c.max} />;
    case "area": return <Area title={c.title} points={c.points} format={FMT[c.unit ?? "n"]} />;
    case "heatmap": return <Heatmap title={c.title} rows={c.rows} cols={c.cols} values={c.values} max={c.max} />;
    case "rings": return <Rings title={c.title} levels={c.levels} />;
  }
}

/** Two-up grid of charts; wide charts (heatmap, grouped, area) take the full row. */
export function ChartGrid({ specs }: { specs: ChartSpec[] }) {
  if (!specs.length) return null;
  // Half-width charts pair up first; wide ones (and a leftover bar chart, which stretches well) take a full row.
  const wide = (c: ChartSpec) => c.kind === "heatmap" || c.kind === "grouped";
  const half = specs.filter((c) => !wide(c)), sorted = [...half, ...specs.filter(wide)];
  const full = (c: ChartSpec) => wide(c) || (half.length % 2 === 1 && c === half.at(-1) && c.kind === "bars");
  return (
    <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
      {sorted.map((c) => <div key={c.title} className={full(c) ? "md:col-span-2" : ""}><ChartView spec={c} /></div>)}
    </div>
  );
}
