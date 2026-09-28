import Link from "next/link";
import { impactTone } from "@/components/term";

export type TickerItem = { id: string; run_id: string; company: string | null; change_type: string | null; title: string; impact_score: number | null };

const COLOR = { down: "text-down", amber: "text-amber", up: "text-up", info: "text-info", violet: "text-violet", dim: "text-dim" };
const GLYPH = { down: "▲", amber: "◆", up: "●", info: "●", violet: "●", dim: "○" };

export function Ticker({ items }: { items: TickerItem[] }) {
  if (!items.length) {
    return (
      <div className="flex h-7 items-center border-b border-line bg-panel px-4 font-mono text-[11px] text-faint">
        <span className="text-amber">WIRE</span>&nbsp;·&nbsp;no verified changes yet. Run a research query to start the feed.
      </div>
    );
  }
  const row = (copy: number) => items.map((c) => {
    const t = impactTone(c.impact_score);
    return (
      <Link key={`${copy}-${c.id}`} aria-hidden={copy === 1 || undefined} tabIndex={copy === 1 ? -1 : undefined} href={`/research/${c.run_id}`} className="flex shrink-0 items-center gap-2 px-5 hover:text-fg">
        <span className={COLOR[t]}>{GLYPH[t]}</span>
        <span className="font-semibold text-fg">{(c.company ?? "—").toUpperCase()}</span>
        <span className="text-faint">{(c.change_type ?? "").toUpperCase()}</span>
        <span className="max-w-[28ch] truncate">{c.title}</span>
        <span className={COLOR[t]}>{c.impact_score ?? "—"}</span>
      </Link>
    );
  });
  return (
    <div className="relative flex h-7 overflow-hidden border-b border-line bg-panel font-mono text-[11px] text-dim" aria-label="Latest verified changes">
      <span className="z-10 flex shrink-0 items-center gap-1.5 border-r border-line bg-panel px-3 font-semibold text-amber">
        <span className="live-dot size-1.5 rounded-full bg-down" /> WIRE
      </span>
      <div className="marquee flex w-max items-center">{row(0)}{row(1)}</div>
    </div>
  );
}
