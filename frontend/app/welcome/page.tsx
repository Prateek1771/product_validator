import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, Building2, FileText, Gauge, KeyRound, Radio, Search, ShieldCheck, Sparkles, TerminalSquare, Workflow } from "lucide-react";
import { DemoLog } from "@/components/DemoLog";
import { Blocks, Brand, Tag } from "@/components/term";
import { REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Served at "/" for signed-out visitors via a proxy.ts rewrite; proxy.ts redirects direct /welcome hits to "/".
export const metadata: Metadata = { alternates: { canonical: "/" } };

const PIPELINE = [
  { tag: "PLAN", color: "text-violet", icon: Workflow, title: "Planner", body: "Reads your question, identifies the companies and their official domains, and splits the work into 3 to 6 focused search tasks." },
  { tag: "WEB", color: "text-info", icon: Search, title: "Researcher", body: "Searches the live web and crawls the best pages to Markdown. Context.dev first, then Tavily, then Firecrawl, with a credit breaker." },
  { tag: "EVID", color: "text-amber", icon: Sparkles, title: "Evidence analyst", body: "Extracts atomic, cited claims, groups them into changes, and flags contradictions between sources and gaps in coverage." },
  { tag: "JEV", color: "text-up", icon: Bot, title: "Decision engine", body: "Jev scores every change: is it real, what type, how big the impact, how strong the evidence. It can send the agent back for more research." },
  { tag: "SYNT", color: "text-violet", icon: FileText, title: "Synthesizer", body: "Writes an executive brief with KPI tiles, key changes, quotes and recommended actions. Unverified claims are labelled, never stated as fact." },
];

const FEATURES = [
  { icon: Radio, title: "Signals feed", body: "Every verified change across your runs, ranked by impact and tagged alert, investigate, monitor or ignore." },
  { icon: TerminalSquare, title: "Live agent log", body: "Watch each plan step, search, crawl, provider switch and decision stream in real time." },
  { icon: Gauge, title: "Typed decisions", body: "Calibrated probabilities instead of vibes: real-change confidence, change type, impact score, evidence quality." },
  { icon: KeyRound, title: "Bring your own keys", body: "Use your own OpenAI, Anthropic, Gemini or OpenRouter key and pick a fast and a strong model for better output." },
  { icon: ShieldCheck, title: "Web data that keeps working", body: "Three search providers with automatic fallback, so a run finishes even when one runs out of credits." },
  { icon: Building2, title: "Watchlist and history", body: "Companies are discovered automatically; every run, source and brief is saved and replayable." },
];

const STACK = [
  ["Frontend", "Next.js 16 App Router, React 19, Tailwind CSS v4, on Vercel"],
  ["API", "FastAPI with server-sent events, Docker on Render"],
  ["Orchestration", "LangGraph state graph with LangChain structured output"],
  ["Reasoning", "LLM gateway: OpenAI by default, or your own Anthropic, Gemini or OpenRouter key"],
  ["Decisions", "Jev typed decisions via OpenRouter, or an LLM decision agent with the same outputs"],
  ["Web data", "Context.dev, Tavily and Firecrawl"],
  ["Auth and data", "InsForge: email and OAuth sign-in, Postgres with row-level security"],
];

const USE_CASES = [
  ["Pricing changes", "\"What changed in Anthropic's API pricing this month?\" Get the old and new numbers, the source, and whether it matters to you."],
  ["Model launches", "\"What did OpenAI, Google and Anthropic ship this week?\" A ranked list of launches with context windows, prices and availability."],
  ["Competitor tracking", "\"How is AWS Bedrock positioning against Azure AI Foundry?\" A side-by-side brief built from official docs and credible news."],
];

const FAQ = [
  ["What is MKT·INTEL?", "An AI market intelligence agent. You ask what changed at an AI company, and a team of agents researches the live web, verifies each claim and writes a sourced brief with recommended actions."],
  ["How is it different from a chatbot with web search?", "Every change is checked by a typed decision engine (Jev) that returns calibrated probabilities for whether it is real, its type, its impact and its evidence quality. Weak evidence triggers more research instead of a confident guess."],
  ["Which sources does it use?", "Live web search and page crawls through Context.dev, Tavily and Firecrawl, prioritising official pricing pages, docs, changelogs and blogs, then credible news. Social media reposts are filtered out."],
  ["Can I use my own API keys and models?", "Yes. Add your own OpenAI, Anthropic, Gemini or OpenRouter key and choose a fast model for planning and a strong model for the brief. Keys are encrypted at rest and never sent to the browser."],
  ["Do I need a Jev subscription?", "No. With an OpenRouter key you get Jev. Without one, decisions run on an LLM decision agent using your own key, with the same checks and output format."],
  ["Is it open source?", "The code is on GitHub, including the LangGraph agent, the FastAPI backend and this Next.js frontend."],
];

const SCREENS = [
  ["/screens/research.png", "Research view: live agent log, executive brief with KPI tiles, and the sources and evidence inspector"],
  ["/screens/home.png", "Terminal home: research prompt with modes and the signals table ranked by impact"],
  ["/screens/palette.png", "Command palette: press Ctrl K to start research or jump anywhere"],
];

function jsonLd() {
  const data = [
    {
      "@context": "https://schema.org", "@type": "SoftwareApplication", name: SITE_NAME, url: SITE_URL,
      applicationCategory: "BusinessApplication", operatingSystem: "Web", description: SITE_DESCRIPTION,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      author: { "@type": "Person", name: "Prateek Hitli", url: "https://github.com/Prateek1771" },
      sameAs: [REPO_URL],
    },
    {
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default function Landing() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd() }} />
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4" aria-label="Main">
          <Link href="/" aria-label="MKT·INTEL home"><Brand /></Link>
          <div className="hidden items-center gap-5 font-mono text-[11px] tracking-wider text-dim uppercase md:flex">
            <a href="#how" className="hover:text-fg">How it works</a>
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#architecture" className="hover:text-fg">Architecture</a>
            <a href="#faq" className="hover:text-fg">FAQ</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn hidden sm:inline-flex">GitHub</a>
            <Link href="/login" className="btn-amber">Sign in</Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="grid-bg border-b border-line">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className="label"><span className="text-amber">●</span> agentic market intelligence for the AI industry</p>
              <h1 className="mt-4 text-4xl leading-[1.08] font-semibold tracking-tight md:text-5xl">
                The AI market intelligence agent that tells you <span className="text-amber">what changed</span> at OpenAI, Anthropic, Google and more.
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-dim">
                Ask about pricing changes, model launches or competitors. Agents search and crawl the live web, verify every claim with typed decisions,
                and hand you a sourced executive brief with the impact and what to do next.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link href="/login" className="btn-amber h-10 px-4">Start researching <ArrowRight className="size-3.5" /></Link>
                <a href="#how" className="btn h-10 px-4">How it works</a>
              </div>
              <dl className="mt-8 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[11px] text-dim">
                <div><dt className="inline text-faint">AGENTS </dt><dd className="inline text-fg">5</dd></div>
                <div><dt className="inline text-faint">WEB PROVIDERS </dt><dd className="inline text-fg">3</dd></div>
                <div><dt className="inline text-faint">LLM PROVIDERS </dt><dd className="inline text-fg">4</dd></div>
                <div><dt className="inline text-faint">DECISIONS </dt><dd className="inline text-up">TYPED</dd></div>
              </dl>
            </div>
            <DemoLog />
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
          <p className="label">how it works</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Five agents, one sourced brief</h2>
          <p className="mt-2 max-w-2xl text-dim">A LangGraph workflow runs your question through five specialised agents. When the evidence is weak, the decision engine loops back for more research before anything is written.</p>
          <ol className="mt-8 grid gap-3 md:grid-cols-5">
            {PIPELINE.map((p, i) => (
              <li key={p.tag} className="panel p-4">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`font-mono text-[11px] font-semibold ${p.color}`}>{p.tag}</span>
                  <p.icon className={`ml-auto size-4 ${p.color}`} aria-hidden />
                </div>
                <h3 className="mt-3 font-semibold">{p.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-line bg-panel">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="label">inside the product</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">A terminal for market intelligence</h2>
            <figure className="mt-8 overflow-hidden rounded-md border border-line">
              <Image src={SCREENS[0][0]} alt={SCREENS[0][1]} width={1440} height={900} priority className="h-auto w-full" />
            </figure>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {SCREENS.slice(1).map(([src, alt]) => (
                <figure key={src} className="overflow-hidden rounded-md border border-line">
                  <Image src={src} alt={alt} width={1440} height={900} className="h-auto w-full" />
                  <figcaption className="border-t border-line px-3 py-2 text-[12px] text-dim">{alt}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
          <p className="label">features</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Built for competitive intelligence on the AI industry</h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="panel p-5">
                <f.icon className="size-5 text-amber" aria-hidden />
                <h3 className="mt-3 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{f.body}</p>
              </li>
            ))}
          </ul>

          <div className="panel mt-3 grid gap-6 p-5 md:grid-cols-[1fr_1.2fr]">
            <div>
              <h3 className="font-semibold">Typed decisions, not guesses</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-dim">
                For every detected change the decision engine returns probabilities. The app turns them into an action:
                alert on high impact, investigate low confidence, monitor the middle, ignore what isn&apos;t real.
              </p>
            </div>
            <dl className="grid grid-cols-[120px_1fr_auto] items-center gap-x-3 gap-y-2 font-mono text-[11px]">
              <dt className="text-faint">REAL CHANGE</dt><dd><Blocks value={92} tone="up" label="confidence" /></dd><dd className="text-up">YES 92%</dd>
              <dt className="text-faint">CHANGE TYPE</dt><dd><Blocks value={72} tone="amber" label="pricing probability" /></dd><dd className="text-amber">PRICING 72%</dd>
              <dt className="text-faint">IMPACT</dt><dd><Blocks value={87} label="impact" /></dd><dd><Tag tone="down">high 87</Tag></dd>
              <dt className="text-faint">ACTION</dt><dd className="col-span-2"><Tag tone="down">alert</Tag></dd>
            </dl>
          </div>
        </section>

        <section className="border-y border-line bg-panel">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <p className="label">use cases</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Questions it answers</h2>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {USE_CASES.map(([t, b]) => (
                <article key={t} className="rounded-md border border-line bg-bg p-5">
                  <h3 className="font-semibold">{t}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-dim">{b}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="architecture" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
          <p className="label">architecture</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">How the system fits together</h2>
          <div className="mt-8 grid items-stretch gap-2 font-mono text-[12px] lg:grid-cols-[1fr_auto_1fr_auto_1.3fr]" role="img"
               aria-label="Architecture: the browser talks to a Next.js app on Vercel and to a FastAPI and LangGraph backend on Render, which calls OpenAI, Jev, the web data providers and InsForge">
            <ArchBox title="Browser" lines={["Next.js 16 UI", "SSR pages on Vercel", "live SSE stream"]} tone="text-info" />
            <Arrow />
            <ArchBox title="FastAPI on Render" lines={["LangGraph agent", "key gateway (BYOK)", "run registry + meters"]} tone="text-amber" />
            <Arrow />
            <div className="grid gap-2">
              <ArchBox title="LLM" lines={["OpenAI · Anthropic · Gemini · OpenRouter"]} tone="text-violet" />
              <ArchBox title="Decisions" lines={["Jev via OpenRouter, or LLM agent"]} tone="text-up" />
              <ArchBox title="Web data" lines={["Context.dev → Tavily → Firecrawl"]} tone="text-info" />
              <ArchBox title="InsForge" lines={["auth + Postgres with RLS"]} tone="text-down" />
            </div>
          </div>

          <h3 className="mt-12 font-semibold">Tech stack</h3>
          <dl className="mt-3 divide-y divide-line rounded-md border border-line">
            {STACK.map(([k, v]) => (
              <div key={k} className="grid gap-1 px-4 py-3 sm:grid-cols-[180px_1fr]">
                <dt className="label">{k}</dt><dd className="text-[13px]">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[13px] text-dim">
            The full architecture, data model and decision rules are documented in the{" "}
            <a href={`${REPO_URL}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer" className="text-amber hover:underline">architecture guide</a>.
          </p>
        </section>

        <section id="faq" className="border-t border-line bg-panel">
          <div className="mx-auto max-w-3xl scroll-mt-16 px-4 py-16">
            <p className="label">faq</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Frequently asked questions</h2>
            <div className="mt-6 divide-y divide-line rounded-md border border-line bg-bg">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group px-4 py-3">
                  <summary className="cursor-pointer list-none font-medium marker:hidden">
                    <span className="mr-2 font-mono text-amber group-open:hidden">+</span><span className="mr-2 hidden font-mono text-amber group-open:inline">−</span>{q}
                  </summary>
                  <p className="mt-2 pl-5 text-[13.5px] leading-relaxed text-dim">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 text-center">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Find out what changed. Decide what to do.</h2>
          <p className="mx-auto mt-2 max-w-xl text-dim">Create a free account and run your first research in under a minute.</p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/login" className="btn-amber h-10 px-4">Start researching <ArrowRight className="size-3.5" /></Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn h-10 px-4">View on GitHub</a>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-6 font-mono text-[11px] text-faint">
          <Brand />
          <span>AI market intelligence agent</span>
          <nav className="ml-auto flex gap-4" aria-label="Footer">
            <a href="#how" className="hover:text-fg">How it works</a>
            <a href="#faq" className="hover:text-fg">FAQ</a>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-fg">GitHub</a>
            <Link href="/login" className="hover:text-fg">Sign in</Link>
          </nav>
        </div>
      </footer>
    </>
  );
}

function ArchBox({ title, lines, tone }: { title: string; lines: string[]; tone: string }) {
  return (
    <div className="panel p-3">
      <p className={`font-semibold uppercase tracking-wider ${tone}`}>{title}</p>
      {lines.map((l) => <p key={l} className="mt-0.5 text-dim">{l}</p>)}
    </div>
  );
}

function Arrow() {
  return <span className="grid place-items-center py-1 text-faint lg:px-1" aria-hidden><span className="lg:hidden">▼</span><span className="hidden lg:inline">──▶</span></span>;
}
