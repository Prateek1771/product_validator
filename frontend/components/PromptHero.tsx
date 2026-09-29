"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Loader2 } from "lucide-react";
import { MODES } from "@/components/shell/CommandPalette";
import { startResearch } from "@/lib/api";
import { PLAYBOOKS, type PlaybookId } from "@/lib/playbooks";
import type { Mode } from "@/lib/types";

const EXAMPLES: { q: string; playbook: PlaybookId }[] = [
  ...PLAYBOOKS.map((p) => ({ q: p.example, playbook: p.id })),
  { q: "What are the biggest trends in home fitness right now?", playbook: "brief" },
  { q: "How is Oatly positioned against its competitors?", playbook: "brief" },
];

export function PromptHero({ initial = "", compact = false }: { initial?: string; compact?: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(initial);
  const [mode, setMode] = useState<Mode>("deep");
  const [playbook, setPlaybook] = useState<PlaybookId>("brief");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (q.trim().length < 3 || busy) return;
    setBusy(true);
    setError(null);
    try {
      router.push(`/research/${await startResearch(q.trim(), mode, playbook)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start research");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className="panel flex items-center gap-2 px-3 transition focus-within:border-amber focus-within:ring-2 focus-within:ring-amber-soft">
        <span className="font-mono text-amber" aria-hidden>&gt;</span>
        <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Research question"
               placeholder="ask about a market, a competitor or a trend…"
               className={`min-w-0 flex-1 bg-transparent font-mono outline-none placeholder:text-faint ${compact ? "h-10 text-[13px]" : "h-14 text-[15px]"}`} />
        <button type="submit" disabled={busy || q.trim().length < 3} className="btn-amber">
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <CornerDownLeft className="size-3.5" />} Run
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Research mode">
        {MODES.map((m) => (
          <button key={m.id} type="button" role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} title={m.hint}
                  className={`rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold tracking-wider transition ${
                    mode === m.id ? "border-amber bg-amber-soft text-amber" : "border-line text-dim hover:text-fg"}`}>
            {m.label}
          </button>
        ))}
        <span className="ml-2 hidden font-mono text-[11px] text-faint sm:inline">{"// "}{MODES.find((m) => m.id === mode)?.hint}</span>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Deliverable">
        <span className="mr-1 font-mono text-[10px] text-faint">OUT</span>
        {PLAYBOOKS.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={playbook === p.id} onClick={() => setPlaybook(p.id)} title={p.hint}
                  className={`rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold tracking-wider transition ${
                    playbook === p.id ? "border-fg bg-hover text-fg" : "border-line text-dim hover:text-fg"}`}>
            {p.label}
          </button>
        ))}
        <span className="ml-2 hidden font-mono text-[11px] text-faint sm:inline">{"// "}{PLAYBOOKS.find((p) => p.id === playbook)?.hint}</span>
      </div>
      {error && <p role="alert" className="mt-2 font-mono text-[12px] text-down">ERR {error}</p>}
      {!compact && (
        <ul className="mt-4 grid gap-1 sm:grid-cols-2">
          {EXAMPLES.map((ex) => (
            <li key={ex.q}>
              <button type="button" onClick={() => { setQ(ex.q); setPlaybook(ex.playbook); input.current?.focus(); }}
                      className="w-full truncate rounded px-2 py-1.5 text-left font-mono text-[12px] text-dim transition hover:bg-hover hover:text-fg">
                <span className="text-faint">$ {ex.playbook === "brief" ? "try" : ex.playbook}:</span> {ex.q}
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}
