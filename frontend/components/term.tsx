import { domain } from "@/lib/format";

type Tone = "amber" | "up" | "down" | "info" | "violet" | "dim";

const TONE: Record<Tone, string> = {
  amber: "border-amber/40 bg-amber-soft text-amber",
  up: "border-up/40 bg-up-soft text-up",
  down: "border-down/40 bg-down-soft text-down",
  info: "border-info/40 bg-info-soft text-info",
  violet: "border-violet/40 bg-violet-soft text-violet",
  dim: "border-line-2 bg-panel-2 text-dim",
};
const TEXT: Record<Tone, string> = { amber: "text-amber", up: "text-up", down: "text-down", info: "text-info", violet: "text-violet", dim: "text-dim" };

export function Tag({ tone = "dim", children, className = "" }: { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-5 shrink-0 items-center gap-1 rounded-sm border px-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function impactTone(score?: number | null): Tone {
  if (score == null) return "dim";
  return score > 70 ? "down" : score >= 30 ? "amber" : "up";
}

export const ACTION_TONE: Record<string, Tone> = { alert: "down", investigate: "violet", monitor: "info", ignore: "dim" };
export const STATUS_TONE: Record<string, Tone> = { complete: "up", failed: "down" };

export function ImpactTag({ score }: { score?: number | null }) {
  const label = score == null ? "N/A" : score > 70 ? "HIGH" : score >= 30 ? "MED" : "LOW";
  return <Tag tone={impactTone(score)}>{label}{score != null && <span className="opacity-70">{score}</span>}</Tag>;
}

export function ActionTag({ action }: { action?: string | null }) {
  return action ? <Tag tone={ACTION_TONE[action] ?? "dim"}>{action}</Tag> : null;
}

/** Segmented ■■■■□□ meter. Colour follows `tone`, or the impact scale when tone is omitted. */
export function Blocks({ value, n = 10, tone, label }: { value: number; n?: number; tone?: Tone; label?: string }) {
  const on = Math.round((Math.max(0, Math.min(100, value)) / 100) * n);
  const t = tone ?? impactTone(value);
  const bg = { amber: "bg-amber", up: "bg-up", down: "bg-down", info: "bg-info", violet: "bg-violet", dim: "bg-dim" }[t];
  return (
    <span className="inline-flex gap-[2px]" role="meter" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "score"}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={`h-2.5 w-1.5 rounded-[1px] ${i < on ? bg : "bg-line-2"}`} />
      ))}
    </span>
  );
}

export function Delta({ score }: { score?: number | null }) {
  const t = impactTone(score);
  return <span className={`font-mono text-[11px] ${TEXT[t]}`} aria-hidden>{t === "down" ? "▲" : t === "amber" ? "◆" : "●"}</span>;
}

export function Panel({ title, count, actions, children, className = "", bodyClassName = "" }: {
  title: React.ReactNode; count?: number | string; actions?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string;
}) {
  return (
    <section className={`panel flex min-w-0 flex-col ${className}`}>
      <header className="flex h-9 shrink-0 items-center gap-2 border-b border-line px-3">
        <span className="size-1.5 rounded-full bg-amber" aria-hidden />
        <h2 className="label text-fg">{title}</h2>
        {count != null && <span className="font-mono text-[10px] text-faint">[{count}]</span>}
        <div className="ml-auto flex items-center gap-1.5">{actions}</div>
      </header>
      <div className={`min-h-0 flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function StatTile({ value, label, sub, tone = "amber" }: { value: string; label: string; sub?: string; tone?: Tone }) {
  return (
    <div className="min-w-0 border-line px-4 py-3">
      <p className={`truncate font-mono text-2xl font-semibold tracking-tight ${TEXT[tone]}`}>{value}</p>
      <p className="label mt-1 truncate text-fg">{label}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-dim">{sub}</p>}
    </div>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Favicon({ url, size = 14 }: { url: string | null; size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny third-party favicons, next/image adds nothing
    <img src={`https://www.google.com/s2/favicons?domain=${domain(url)}&sz=64`} alt="" width={size} height={size}
         className="shrink-0 rounded-[2px] bg-panel-2" loading="lazy" />
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2 font-mono text-[13px] font-bold tracking-[0.12em]">
      <span className="grid size-6 place-items-center rounded-sm bg-amber text-[11px] text-amber-ink">M</span>
      {!compact && <span>MKT<span className="text-amber">·</span>INTEL</span>}
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <p className="font-mono text-xs text-faint">{"// "}no data</p>
      <p className="mt-2 font-medium">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-dim">{children}</div>}
    </div>
  );
}

export function PageTitle({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="label">{sub ?? "mkt·intel"}</p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
      </div>
      {children}
    </header>
  );
}
