"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, History, Loader2, Sparkles } from "lucide-react";
import { Kbd } from "@/components/term";
import { startResearch } from "@/lib/api";
import { NAV } from "@/lib/nav";
import { useHotkeys } from "@/lib/useHotkeys";
import type { Mode } from "@/lib/types";

export const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: "deep", label: "DEEP", hint: "multi-step research, Jev verification loops" },
  { id: "web", label: "WEB", hint: "fast single pass over recent coverage" },
  { id: "company", label: "COMPANY", hint: "everything that changed at one company" },
  { id: "market", label: "MARKET", hint: "compare companies and competitors" },
];

type Item = { id: string; group: string; label: string; hint?: string; icon: React.ReactNode; href?: string };

export function CommandPalette({ recent }: { recent: { id: string; query: string }[] }) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("deep");
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (query = "") => {
    setQ(query);
    setSel(0);
    setError(null);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();

  useHotkeys({ "mod+k": () => open(), "/": () => open() });
  useEffect(() => {
    const onOpen = (e: Event) => open((e as CustomEvent<string>).detail);
    window.addEventListener("palette:open", onOpen);
    return () => window.removeEventListener("palette:open", onOpen);
  }, []);

  const items = useMemo<Item[]>(() => {
    const needle = q.trim().toLowerCase();
    const out: Item[] = [];
    if (needle.length >= 3) out.push({ id: "run", group: "Research", label: q.trim(), hint: `run ${mode}`, icon: <Sparkles className="size-3.5 text-amber" /> });
    for (const n of NAV) {
      if (!needle || n.label.toLowerCase().includes(needle)) out.push({ id: n.href, group: "Go to", label: n.label, hint: n.key, icon: <n.icon className="size-3.5" />, href: n.href });
    }
    for (const r of recent) {
      if (!needle || r.query.toLowerCase().includes(needle)) out.push({ id: r.id, group: "Recent runs", label: r.query, icon: <History className="size-3.5" />, href: `/research/${r.id}` });
    }
    return out.slice(0, 14);
  }, [q, mode, recent]);

  async function runItem(it: Item) {
    if (it.href) {
      close();
      router.push(it.href);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const id = await startResearch(q.trim(), mode);
      close();
      router.push(`/research/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start research");
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(items.length - 1, s + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === "Tab") { e.preventDefault(); setMode((m) => MODES[(MODES.findIndex((x) => x.id === m) + (e.shiftKey ? 3 : 1)) % 4].id); }
    else if (e.key === "Enter" && items[sel] && !busy) { e.preventDefault(); runItem(items[sel]); }
  }

  let lastGroup = "";
  return (
    <dialog ref={dialog} onClick={(e) => e.target === dialog.current && close()} aria-label="Command palette"
            className="m-auto mt-[12vh] w-[min(640px,calc(100vw-24px))] rounded-md border border-line-2 bg-panel p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-line px-3">
        <span className="font-mono text-amber">&gt;</span>
        <input value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} onKeyDown={onKey} autoFocus
               placeholder="What changed at Anthropic this month?" aria-label="Command or research question"
               className="h-12 min-w-0 flex-1 bg-transparent font-mono text-[14px] outline-none placeholder:text-faint" />
        {busy && <Loader2 className="size-4 animate-spin text-amber" />}
      </div>
      <div className="flex items-center gap-1 border-b border-line px-3 py-2" role="radiogroup" aria-label="Research mode">
        {MODES.map((m) => (
          <button key={m.id} role="radio" aria-checked={mode === m.id} onClick={() => setMode(m.id)} title={m.hint}
                  className={`rounded-sm px-2 py-1 font-mono text-[10px] font-semibold tracking-wider ${mode === m.id ? "bg-amber text-amber-ink" : "text-dim hover:text-fg"}`}>
            {m.label}
          </button>
        ))}
        <span className="ml-auto hidden font-mono text-[10px] text-faint sm:inline">{MODES.find((m) => m.id === mode)?.hint}</span>
      </div>
      {error && <p role="alert" className="border-b border-line bg-down-soft px-4 py-2 font-mono text-[12px] text-down">{error}</p>}
      <ul role="listbox" className="max-h-[50vh] overflow-y-auto py-1">
        {items.map((it, i) => {
          const header = it.group !== lastGroup ? (lastGroup = it.group) : null;
          return (
            <li key={it.id + i}>
              {header && <p className="label px-4 pt-2.5 pb-1">{header}</p>}
              <button role="option" aria-selected={i === sel} onMouseEnter={() => setSel(i)} onClick={() => runItem(it)}
                      className={`flex w-full items-center gap-3 px-4 py-2 text-left text-[13px] ${i === sel ? "bg-hover text-fg" : "text-dim"}`}>
                {it.icon}<span className="min-w-0 flex-1 truncate">{it.label}</span>
                {it.hint && <span className="font-mono text-[10px] uppercase text-faint">{it.hint}</span>}
                {i === sel && <CornerDownLeft className="size-3.5 text-amber" />}
              </button>
            </li>
          );
        })}
        {!items.length && <li className="px-4 py-6 text-center font-mono text-[12px] text-faint">Type at least 3 characters to research.</li>}
      </ul>
      <footer className="flex items-center gap-4 border-t border-line px-4 py-2 font-mono text-[10px] text-faint">
        <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
        <span className="flex items-center gap-1"><Kbd>↵</Kbd> run</span>
        <span className="flex items-center gap-1"><Kbd>Tab</Kbd> mode</span>
        <span className="ml-auto flex items-center gap-1"><Kbd>Esc</Kbd> close</span>
      </footer>
    </dialog>
  );
}
