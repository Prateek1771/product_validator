import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Brand, Tag } from "@/components/term";
import { PLAYBOOKS } from "@/lib/playbooks";
import { REPO_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

// Served at "/" for signed-out visitors via a proxy.ts rewrite; proxy.ts redirects direct /welcome hits to "/".
export const metadata: Metadata = { alternates: { canonical: "/" } };

const STEPS = [
  ["Plan", "planner", "Finds the companies and their official domains, then splits your question into focused search tasks."],
  ["Research", "researcher", "Searches the live web and crawls the best pages. Context.dev first, then Tavily, then Firecrawl."],
  ["Verify", "evidence analyst", "Extracts cited claims, groups them into changes, and flags contradictions and gaps."],
  ["Decide", "decision engine", "Jev scores each change: real or not, what type, how big. Weak evidence sends the agent back out."],
  ["Write", "synthesizer", "Writes the brief or playbook report. Unverified claims are labelled, never stated as fact."],
];

const PLAYBOOK_COPY: Record<string, string> = {
  brief: "What changed, ranked by impact, with Jev-verified evidence and recommended actions.",
  profile: "One comparable profile per company: positioning, pricing, customers, strengths, weaknesses and a positioning map.",
  pricing: "Tier-by-tier prices, hidden costs, cost scenarios, and a pricing-page score for human buyers and AI agents.",
  battlecard: "Where each side wins, objection handling, landmine questions, migration notes and who should pick which.",
};

const FEATURES: { group: string; items: [string, string][] }[] = [
  { group: "Research you can check", items: [
    ["Typed decisions", "Calibrated probabilities instead of vibes, turned into alert, investigate, monitor or ignore."],
    ["Web data that keeps working", "Three search providers with automatic fallback, so a run finishes when one runs out of credits."],
    ["Live agent log", "Every plan step, search, crawl, provider switch and decision streams in as it happens."],
  ] },
  { group: "Your keys, your models", items: [
    ["Bring your own keys", "OpenAI, Anthropic, Gemini or OpenRouter. Pick a fast model for planning and a strong one for the report."],
    ["Jev is optional", "Without an OpenRouter key, an LLM decision agent returns the same typed answers with your own key."],
  ] },
  { group: "Built for the workflow", items: [
    ["Signals, watchlist and history", "Verified changes across all runs, companies discovered automatically, every run replayable."],
    ["Exports", "Markdown per company, JSON data, or print to PDF."],
    ["Keyboard first", "Ctrl K for the command palette, number keys to navigate, j and k to move through lists."],
  ] },
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

const FAQ = [
  ["What is MKT·INTEL?", "An AI market intelligence agent. You ask what changed at an AI company, and a team of agents researches the live web, verifies each claim and writes a sourced brief with recommended actions."],
  ["How is it different from a chatbot with web search?", "Every change is checked by a typed decision engine (Jev) that returns calibrated probabilities for whether it is real, its type, its impact and its evidence quality. Weak evidence triggers more research instead of a confident guess."],
  ["Which sources does it use?", "Live web search and page crawls through Context.dev, Tavily and Firecrawl, prioritising official pricing pages, docs, changelogs and blogs, then credible news. Social media reposts are filtered out."],
  ["Can I use my own API keys and models?", "Yes. Add your own OpenAI, Anthropic, Gemini or OpenRouter key and choose a fast model for planning and a strong model for the brief. Keys are encrypted at rest and never sent to the browser."],
  ["Do I need a Jev subscription?", "No. With an OpenRouter key you get Jev. Without one, decisions run on an LLM decision agent using your own key, with the same checks and output format."],
  ["Is it open source?", "The code is on GitHub, including the LangGraph agent, the FastAPI backend and this Next.js frontend."],
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

const Shot = ({ src, alt, caption, className = "", priority = false, sizes }: {
  src: string; alt: string; caption?: string; className?: string; priority?: boolean; sizes: string;
}) => (
  <figure className={className}>
    <div className="overflow-hidden rounded-md border border-line-2 bg-panel shadow-[0_24px_60px_-28px_color-mix(in_srgb,var(--bg)_40%,#000)]">
      <Image src={src} alt={alt} width={1440} height={900} priority={priority} sizes={sizes} quality={90} className="h-auto w-full" />
    </div>
    {caption && <figcaption className="mt-2 text-[13px] text-dim">{caption}</figcaption>}
  </figure>
);

export default function Landing() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd() }} />
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-[1400px] items-center gap-6 px-4" aria-label="Main">
          <Link href="/"><Brand /></Link>
          <div className="hidden items-center gap-5 font-mono text-[11px] tracking-wider text-dim uppercase md:flex">
            <a href="#how" className="transition hover:text-fg">How it works</a>
            <a href="#features" className="transition hover:text-fg">Features</a>
            <a href="#architecture" className="transition hover:text-fg">Architecture</a>
            <a href="#faq" className="transition hover:text-fg">FAQ</a>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn hidden sm:inline-flex">GitHub</a>
            <Link href="/login" className="btn-amber">Sign in</Link>
          </div>
        </nav>
      </header>

      <main id="main">
        <section className="overflow-hidden border-b border-line">
          <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 pt-14 pb-16 md:pt-20 lg:grid-cols-[6fr_7fr] lg:pb-20">
            <div>
              <h1 className="rise text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl xl:text-[54px]">
                AI market intelligence, <span className="text-amber">with receipts.</span>
              </h1>
              <p className="rise mt-5 max-w-[46ch] text-[17px] leading-relaxed text-dim" style={{ "--i": 1 } as React.CSSProperties}>
                Ask what changed at any AI company. Agents search the live web, verify every claim, and write a sourced report.
              </p>
              <div className="rise mt-8 flex flex-wrap items-center gap-5" style={{ "--i": 2 } as React.CSSProperties}>
                <Link href="/login" className="btn-amber h-11 px-5 text-[12px]">Start researching <ArrowRight className="size-3.5" /></Link>
                <a href="#how" className="font-mono text-[12px] tracking-wider text-dim uppercase underline-offset-4 transition hover:text-fg hover:underline">How it works</a>
              </div>
            </div>
            <Shot src="/screens/research.png" priority sizes="(min-width: 1024px) 60vw, 100vw" className="lg:-mr-40"
                  alt="Research view: live agent log, a pricing teardown of the OpenAI API vs the Anthropic API, and the sources inspector" />
          </div>
        </section>

        <section id="how" className="mx-auto max-w-[1400px] scroll-mt-16 px-4 py-20 md:py-24">
          <div className="reveal">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Five agents between your question and the report</h2>
            <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-dim">A LangGraph workflow. When the evidence is weak, the decision engine loops back for more research before anything is written.</p>
          </div>
          <ol className="reveal mt-12 grid gap-8 md:grid-cols-5 md:gap-0">
            {STEPS.map(([verb, agent, body]) => (
              <li key={verb} className="relative border-l border-line-2 pl-5 md:border-t md:border-l-0 md:pt-6 md:pr-6 md:pl-0">
                <span className="absolute top-1.5 -left-[4px] size-[7px] bg-line-2 md:-top-[4px] md:left-0" aria-hidden />
                <h3 className="text-lg font-semibold">{verb}</h3>
                <p className="font-mono text-[11px] text-faint">{agent}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-dim">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-line bg-panel">
          <div className="mx-auto grid max-w-[1400px] items-center gap-12 px-4 py-20 md:py-24 lg:grid-cols-[1fr_1.35fr]">
            <div className="reveal">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">One question, four kinds of report</h2>
              <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-dim">Pick the output before you run. The playbook decides which pages the agents read and how the report is structured.</p>
              <dl className="mt-8 space-y-6">
                {PLAYBOOKS.map((p) => (
                  <div key={p.id} className="grid grid-cols-[104px_1fr] gap-4">
                    <dt className="pt-0.5"><Tag tone={p.id === "brief" ? "amber" : "dim"}>{p.label}</Tag></dt>
                    <dd>
                      <p className="text-[14.5px]">{PLAYBOOK_COPY[p.id]}</p>
                      <p className="mt-1 font-mono text-[12px] text-faint">&gt; {p.example}</p>
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
            <Shot src="/screens/battlecard.png" sizes="(min-width: 1024px) 55vw, 100vw" className="reveal"
                  alt="Battlecard for Anthropic Claude vs OpenAI: TL;DR, where each side wins, and paragraph comparisons by category" />
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-20 md:py-24">
          <h2 className="reveal text-3xl font-semibold tracking-tight md:text-4xl">A terminal for market intelligence</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:grid-rows-2">
            <Shot src="/screens/light.png" sizes="(min-width: 1024px) 64vw, 100vw" className="reveal lg:col-span-2"
                  alt="Competitor profile of Mistral AI and Cohere in the light theme, with a positioning map and key takeaways"
                  caption="Competitor profile with a positioning map, in the light theme." />
            <figure className="reveal lg:row-span-2">
              <div className="mx-auto max-w-[320px] overflow-hidden rounded-[22px] border border-line-2 bg-panel lg:max-w-none">
                <Image src="/screens/mobile.png" alt="The research view on a phone, with agent, brief and inspector tabs" width={390} height={844} sizes="(min-width: 1024px) 30vw, 320px" quality={90} className="h-auto w-full" />
              </div>
              <figcaption className="mt-2 text-center text-[13px] text-dim lg:text-left">The same report on a phone.</figcaption>
            </figure>
            <Shot src="/screens/palette.png" sizes="(min-width: 1024px) 64vw, 100vw" className="reveal lg:col-span-2"
                  alt="Command palette with research modes and playbooks, opened with Ctrl K"
                  caption="Ctrl K starts any run: pick a mode, Shift Tab picks the report." />
          </div>
        </section>

        <section id="features" className="scroll-mt-16 border-y border-line bg-panel">
          <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-20 md:py-24 lg:grid-cols-[1fr_2fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Built for competitive intelligence on the AI industry</h2>
              <div className="mt-8 rounded-md border border-line bg-bg p-4 font-mono text-[12px]" aria-label="Example typed decision for one detected change">
                <p className="text-dim">Opus 5.5 price cut</p>
                <dl className="mt-3 grid grid-cols-[1fr_auto] gap-y-2">
                  <dt className="text-faint">real change</dt><dd className="text-up">92%</dd>
                  <dt className="text-faint">type</dt><dd>pricing <span className="text-faint">72%</span></dd>
                  <dt className="text-faint">impact</dt><dd>87 / 100</dd>
                  <dt className="text-faint">action</dt><dd><Tag tone="down">alert</Tag></dd>
                </dl>
              </div>
            </div>
            <div className="space-y-12">
              {FEATURES.map((g) => (
                <div key={g.group} className="reveal">
                  <h3 className="border-b border-line pb-3 text-[15px] font-semibold text-amber">{g.group}</h3>
                  <dl className="mt-5 grid gap-x-10 gap-y-6 sm:grid-cols-2">
                    {g.items.map(([t, b]) => (
                      <div key={t}><dt className="font-semibold">{t}</dt><dd className="mt-1 text-[14px] leading-relaxed text-dim">{b}</dd></div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="architecture" className="mx-auto max-w-[1400px] scroll-mt-16 px-4 py-20 md:py-24">
          <h2 className="reveal text-3xl font-semibold tracking-tight md:text-4xl">How the system fits together</h2>
          <div className="reveal mt-10 grid items-stretch gap-2 font-mono text-[12px] lg:grid-cols-[1fr_auto_1fr_auto_1.3fr]" role="img"
               aria-label="Architecture: the browser talks to a Next.js app on Vercel and to a FastAPI and LangGraph backend on Render, which calls the LLM gateway, Jev, the web data providers and InsForge">
            <ArchBox title="Browser" lines={["Next.js 16 UI", "SSR pages on Vercel", "live SSE stream"]} />
            <Arrow />
            <ArchBox title="FastAPI on Render" lines={["LangGraph agent", "key gateway (BYOK)", "run registry and meters"]} accent />
            <Arrow />
            <div className="grid gap-2">
              <ArchBox title="LLM" lines={["OpenAI, Anthropic, Gemini, OpenRouter"]} />
              <ArchBox title="Decisions" lines={["Jev via OpenRouter, or LLM agent"]} />
              <ArchBox title="Web data" lines={["Context.dev → Tavily → Firecrawl"]} />
              <ArchBox title="InsForge" lines={["auth and Postgres with RLS"]} />
            </div>
          </div>

          <dl className="reveal mt-14 grid gap-x-12 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {STACK.map(([k, v]) => (
              <div key={k}><dt className="label">{k}</dt><dd className="mt-1.5 text-[14px]">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-10 text-[14px] text-dim">
            The full architecture, data model and decision rules are in the{" "}
            <a href={`${REPO_URL}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer" className="text-amber underline underline-offset-2">architecture guide</a>.
          </p>
        </section>

        <section id="faq" className="scroll-mt-16 border-t border-line bg-panel">
          <div className="mx-auto max-w-[1400px] px-4 py-20 md:py-24">
            <h2 className="reveal text-3xl font-semibold tracking-tight md:text-4xl">Frequently asked questions</h2>
            <dl className="reveal mt-10 grid gap-x-16 gap-y-10 md:grid-cols-2">
              {FAQ.map(([q, a]) => (
                <div key={q}><dt className="text-[16px] font-semibold">{q}</dt><dd className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-dim">{a}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="reveal mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:py-20">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Find out what changed. Decide what to do.</h2>
              <p className="mt-2 text-[15px] text-dim">Create a free account and run your first research in under a minute.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/login" className="btn-amber h-11 px-5 text-[12px]">Start researching <ArrowRight className="size-3.5" /></Link>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn h-11 px-5 text-[12px]">GitHub</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-4 py-6 font-mono text-[11px] text-faint">
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

function ArchBox({ title, lines, accent = false }: { title: string; lines: string[]; accent?: boolean }) {
  return (
    <div className={`rounded-md border bg-panel p-3 ${accent ? "border-amber/50" : "border-line"}`}>
      <p className={`font-semibold tracking-wider uppercase ${accent ? "text-amber" : "text-fg"}`}>{title}</p>
      {lines.map((l) => <p key={l} className="mt-0.5 text-dim">{l}</p>)}
    </div>
  );
}

function Arrow() {
  return <span className="grid place-items-center py-1 text-faint lg:px-1" aria-hidden><span className="lg:hidden">▼</span><span className="hidden lg:inline">──▶</span></span>;
}
