"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Check, ExternalLink, KeyRound, Loader2, ShieldCheck, Trash2 } from "lucide-react";
import { Panel, Tag } from "@/components/term";
import { deleteKey, getSettings, listModels, resetLlm, saveKey, saveLlm } from "@/lib/api";
import type { KeyProvider, LlmProvider, ModelInfo, UserSettings } from "@/lib/types";

const LLM: { id: LlmProvider; name: string; note: string }[] = [
  { id: "openai", name: "OpenAI", note: "GPT models" },
  { id: "anthropic", name: "Anthropic", note: "Claude models" },
  { id: "google", name: "Gemini", note: "Google AI Studio" },
  { id: "openrouter", name: "OpenRouter", note: "every model + Jev decisions" },
];
const WEB: { id: KeyProvider; name: string; note: string }[] = [
  { id: "context", name: "Context.dev", note: "primary search & crawl" },
  { id: "tavily", name: "Tavily", note: "search fallback" },
  { id: "firecrawl", name: "Firecrawl", note: "search & scrape fallback" },
];

export function SettingsView({ initial = null }: { initial?: UserSettings | null }) {
  const [s, setS] = useState<UserSettings | null>(initial);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!initial) getSettings().then(setS).catch((e) => setError(e instanceof Error ? e.message : "Backend unreachable"));
  }, [initial]);

  if (error) return <p role="alert" className="rounded border border-down/40 bg-down-soft px-3 py-2 font-mono text-[12px] text-down">ERR {error}</p>;
  if (!s) return <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="scan h-48 rounded" />)}</div>;
  return (
    <div className="space-y-3">
      {s.decider.notice && (
        <div role="status" className="flex gap-3 rounded border border-amber/40 bg-amber-soft px-4 py-3 text-[13px]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber" />
          <div>
            <p className="label text-amber">decision engine · llm agent</p>
            <p className="mt-1">{s.decider.notice}</p>
          </div>
        </div>
      )}
      <ModelsPanel s={s} onChange={setS} />
      <KeysPanel s={s} onChange={setS} />
    </div>
  );
}

const hasKey = (s: UserSettings, p: KeyProvider) => s.keys.some((k) => k.provider === p);

function ModelsPanel({ s, onChange }: { s: UserSettings; onChange: (s: UserSettings) => void }) {
  const [provider, setProvider] = useState<LlmProvider>(s.llm?.provider ?? "openai");
  const [fast, setFast] = useState(s.llm?.fast_model ?? s.defaults.fast_model);
  const [strong, setStrong] = useState(s.llm?.strong_model ?? s.defaults.strong_model);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [state, setState] = useState<"idle" | "loading" | "saving">("idle");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const usable = (p: LlmProvider) => hasKey(s, p) || s.platform[p];

  const load = useCallback((p: LlmProvider) => {
    listModels(p).then(setModels).catch((e) => setMsg({ ok: false, text: e instanceof Error ? e.message : "Could not load models" }))
      .finally(() => setState("idle"));
  }, []);
  useEffect(() => {
    if (usable(provider)) load(provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload only when the provider or its key changes
  }, [provider, load, s.keys.length]);

  function pick(p: LlmProvider) {
    setProvider(p);
    setModels([]);
    setMsg(null);
    if (p === s.llm?.provider) { setFast(s.llm.fast_model); setStrong(s.llm.strong_model); }
    else if (p === "openai") { setFast(s.defaults.fast_model); setStrong(s.defaults.strong_model); }
    else { setFast(""); setStrong(""); }
    if (usable(p)) setState("loading");
  }

  async function save() {
    setState("saving");
    setMsg(null);
    try {
      onChange(await saveLlm(provider, fast, strong));
      setMsg({ ok: true, text: "Saved. New runs use these models." });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setState("idle");
    }
  }
  async function reset() {
    onChange(await resetLlm());
    setProvider("openai"); setFast(s.defaults.fast_model); setStrong(s.defaults.strong_model);
    setMsg({ ok: true, text: "Reset to the platform default." });
  }

  const unknown = (id: string) => models.length > 0 && id && !models.some((m) => m.id === id);
  return (
    <Panel title="Models" actions={<Tag tone={s.effective.byok ? "up" : "dim"}>{s.effective.byok ? "your key" : "platform"}</Tag>} bodyClassName="p-3">
      <p className="font-mono text-[11px] text-dim">
        <span className="text-faint">ACTIVE </span>fast <span className="text-fg">{s.effective.fast}</span> <span className="text-faint">·</span> strong <span className="text-fg">{s.effective.strong}</span>
      </p>

      <div className="mt-3 grid gap-1 sm:grid-cols-4" role="radiogroup" aria-label="LLM provider">
        {LLM.map((p) => {
          const ok = usable(p.id);
          return (
            <button key={p.id} role="radio" aria-checked={provider === p.id} disabled={!ok} onClick={() => pick(p.id)} title={ok ? p.note : `Add a ${p.name} key below`}
                    className={`rounded border px-3 py-2 text-left transition disabled:opacity-40 ${provider === p.id ? "border-amber bg-amber-soft" : "border-line hover:border-line-2"}`}>
              <span className={`block font-mono text-[11px] font-semibold uppercase tracking-wider ${provider === p.id ? "text-amber" : ""}`}>{p.name}</span>
              <span className="block truncate text-[11px] text-dim">{ok ? p.note : "needs a key"}</span>
            </button>
          );
        })}
      </div>

      <datalist id="model-options">
        {models.map((m) => <option key={m.id} value={m.id} label={m.name ? `${m.name}${m.structured === false ? " · no structured output" : ""}` : undefined} />)}
      </datalist>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {([["fast", "plan · extract · llm decisions", fast, setFast], ["strong", "final brief", strong, setStrong]] as const).map(([k, hint, value, set]) => (
          <label key={k} className="block">
            <span className="label mb-1.5 flex items-center gap-2">{k} <span className="normal-case tracking-normal text-faint">{"// "}{hint}</span></span>
            <input list="model-options" value={value} onChange={(e) => set(e.target.value)} placeholder={state === "loading" ? "loading models…" : "search or type a model id"}
                   className="field" spellCheck={false} aria-label={`${k} model`} />
            {unknown(value) && <span className="mt-1 block font-mono text-[10px] text-amber">custom id: not in {provider}&apos;s list</span>}
          </label>
        ))}
      </div>
      <p className="mt-2 font-mono text-[10px] text-faint">
        {state === "loading" ? "loading live model list…" : models.length ? `${models.length} models from ${provider}'s API` : ""}
        {provider === "openrouter" && models.length > 0 && " · pick one with structured output"}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={!fast.trim() || !strong.trim() || state === "saving" || !usable(provider)} className="btn-amber">
          {state === "saving" && <Loader2 className="size-3.5 animate-spin" />} save models
        </button>
        {s.llm && <button onClick={reset} className="btn">reset to platform</button>}
        {msg && <span role="status" className={`font-mono text-[11px] ${msg.ok ? "text-up" : "text-down"}`}>{msg.text}</span>}
      </div>
    </Panel>
  );
}

function KeysPanel({ s, onChange }: { s: UserSettings; onChange: (s: UserSettings) => void }) {
  return (
    <Panel title="API keys" actions={<span className="flex items-center gap-1 font-mono text-[10px] text-dim"><ShieldCheck className="size-3.5 text-up" /> encrypted at rest</span>}>
      <p className="border-b border-line px-3 py-2 text-[12.5px] text-dim">
        Your keys are used first for your runs; platform keys are the fallback. Keys are encrypted, never shown again, and never sent to the browser.
      </p>
      <p className="label border-b border-line/60 px-3 pt-3 pb-1.5">llm</p>
      {LLM.map((p) => <KeyRow key={p.id} id={p.id} name={p.name} note={p.note} s={s} onChange={onChange} />)}
      <p className="label border-y border-line/60 px-3 pt-3 pb-1.5">web data</p>
      {WEB.map((p) => <KeyRow key={p.id} id={p.id} name={p.name} note={p.note} s={s} onChange={onChange} />)}
    </Panel>
  );
}

function KeyRow({ id, name, note, s, onChange }: { id: KeyProvider; name: string; note: string; s: UserSettings; onChange: (s: UserSettings) => void }) {
  const mine = s.keys.find((k) => k.provider === id);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      onChange(await saveKey(id, value.trim()));
      setValue("");
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    try { onChange(await deleteKey(id)); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={save} className="grid items-center gap-2 border-b border-line/60 px-3 py-2.5 last:border-0 md:grid-cols-[180px_170px_1fr_auto]">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 font-mono text-[12px] font-semibold uppercase"><KeyRound className="size-3.5 text-dim" />{name}</p>
        <p className="truncate text-[11px] text-dim">{note}</p>
      </div>
      <div>
        {mine ? <Tag tone="up">your key ••••{mine.hint}{mine.verified && <Check className="size-3" />}</Tag>
          : s.platform[id] ? <Tag tone="info">platform</Tag> : <Tag>not set</Tag>}
        {mine && !mine.verified && <span className="ml-1 font-mono text-[10px] text-faint">unverified</span>}
      </div>
      <div className="min-w-0">
        <input type="password" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false}
               placeholder={mine ? "replace key…" : "paste key…"} aria-label={`${name} API key`} className="field h-8" />
        {err && <p role="alert" className="mt-1 font-mono text-[10px] text-down">{err}</p>}
      </div>
      <div className="flex items-center gap-1">
        <button type="submit" disabled={busy || !value.trim()} className="btn">{busy ? <Loader2 className="size-3.5 animate-spin" /> : "save"}</button>
        {mine && <button type="button" onClick={remove} disabled={busy} className="btn w-8 px-0" aria-label={`Remove ${name} key`}><Trash2 className="size-3.5" /></button>}
        <a href={s.links[id]} target="_blank" rel="noreferrer" className="btn w-8 px-0" aria-label={`Get a ${name} key`} title="Get a key"><ExternalLink className="size-3.5" /></a>
      </div>
    </form>
  );
}
