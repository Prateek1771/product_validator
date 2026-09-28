import { DEMO_LOG, DEMO_WIRE } from "@/lib/demo";

export function DemoLog({ className = "" }: { className?: string }) {
  return (
    <div className={`panel overflow-hidden font-mono text-[11.5px] leading-[1.75] ${className}`} aria-label="Example agent log">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="label text-fg">agent log</span><span className="ml-auto text-[10px] text-faint">DEMO</span>
      </div>
      <div className="overflow-x-auto p-3">
        <p className="text-faint">$ mkt-intel research &quot;what changed in anthropic&apos;s pricing?&quot;</p>
        {DEMO_LOG.map(([t, tag, color, g, msg]) => (
          <div key={t + msg} className="grid grid-cols-[42px_36px_14px_1fr] gap-x-1.5">
            <span className="text-faint">{t}</span><span className={`font-semibold ${color}`}>{tag}</span>
            <span className={g === "!" ? "text-amber" : "text-up"}>{g}</span><span className="text-dim">{msg}</span>
          </div>
        ))}
        <p className="cursor mt-1 text-dim">&nbsp;</p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line px-3 py-2 text-[11px]">
        {DEMO_WIRE.map(([g, c, co, ty, s]) => <span key={co}><span className={c}>{g}</span> <b className="text-fg">{co}</b> <span className="text-faint">{ty}</span> <span className={c}>{s}</span></span>)}
      </div>
    </div>
  );
}
