import { Brand } from "@/components/term";
import { LoginForm } from "./LoginForm";

// Illustrative feed for the sign-in screen only.
const DEMO = [
  ["00:03", "PLAN", "text-violet", "✓", "6 tasks · pricing, models, docs, changelog, news, competitors"],
  ["00:12", "WEB ", "text-info", "✓", "site:anthropic.com pricing — 5 src, 2 crawled"],
  ["00:19", "WEB ", "text-info", "!", "Context.dev out of credits → Tavily"],
  ["00:24", "WEB ", "text-info", "✓", "\"new model\" announcement — 5 src · via Tavily"],
  ["00:38", "EVID", "text-amber", "✓", "8 claims · 2 changes · 1 contradiction"],
  ["00:39", "JEV ", "text-up", "✓", "Opus pricing cut: real 92% · pricing · impact 87 → ALERT"],
  ["00:44", "SYNT", "text-violet", "✓", "brief ready"],
];
const WIRE = [["▲", "text-down", "ANTHROPIC", "PRICING", "87"], ["◆", "text-amber", "OPENAI", "MODEL", "64"], ["●", "text-up", "GOOGLE", "DOCS", "22"]];

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <section className="grid-bg relative hidden flex-col border-r border-line bg-panel p-10 lg:flex">
        <Brand />
        <div className="mt-auto max-w-xl">
          <p className="label"><span className="text-amber">●</span> agentic market intelligence</p>
          <h1 className="mt-3 text-4xl leading-[1.1] font-semibold tracking-tight">
            Track the AI industry.<br />Find what changed.<br /><span className="text-amber">Decide what to do.</span>
          </h1>
          <div className="panel mt-8 overflow-hidden font-mono text-[11.5px] leading-[1.75]" aria-label="Example agent log">
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <span className="label text-fg">agent log</span><span className="ml-auto text-[10px] text-faint">DEMO</span>
            </div>
            <div className="p-3">
              <p className="text-faint">$ mkt-intel research &quot;what changed in anthropic&apos;s pricing?&quot;</p>
              {DEMO.map(([t, tag, color, g, msg]) => (
                <div key={t + msg} className="grid grid-cols-[42px_36px_14px_1fr] gap-x-1.5">
                  <span className="text-faint">{t}</span><span className={`font-semibold ${color}`}>{tag}</span>
                  <span className={g === "!" ? "text-amber" : "text-up"}>{g}</span><span className="text-dim">{msg}</span>
                </div>
              ))}
              <p className="cursor mt-1 text-dim">&nbsp;</p>
            </div>
            <div className="flex gap-6 border-t border-line px-3 py-2 text-[11px]">
              {WIRE.map(([g, c, co, ty, s]) => <span key={co}><span className={c}>{g}</span> <b className="text-fg">{co}</b> <span className="text-faint">{ty}</span> <span className={c}>{s}</span></span>)}
            </div>
          </div>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Brand /></div>
          <LoginForm oauthError={error ? String(error) : undefined} />
        </div>
      </section>
    </main>
  );
}
