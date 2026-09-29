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
  ["Plan", "planner", "Works out which companies, sources and official pages to check."],
  ["Research", "researcher", "Searches the live web and reads the best pages in full."],
  ["Verify", "evidence analyst", "Pulls out every claim with its source and flags where sources disagree."],
  ["Decide", "decision engine", "Scores each finding: is it real, what kind, how big. Weak evidence means another round."],
  ["Write", "synthesizer", "Writes your report. Anything unverified is labelled, never stated as fact."],
];

const PLAYBOOK_COPY: Record<string, string> = {
  brief: "What changed in your market and what to do about it, ranked by impact.",
  profile: "Side-by-side profiles of each competitor: positioning, pricing, customers, strengths and weaknesses, plus a positioning map.",
  pricing: "Every tier and hidden cost, what a typical customer pays on each, and how clear each pricing page is.",
  battlecard: "Where each side wins, answers to common objections, questions that expose weak spots, and who should pick which.",
};

const FEATURES: { group: string; items: [string, string][] }[] = [
  { group: "Research you can trust", items: [
    ["A next step for every finding", "Each finding gets a probability that it is real and an impact score, then a clear call: alert, investigate, monitor or ignore."],
    ["Runs finish when a provider runs dry", "Three search providers with automatic fallback, so one running out of credits never stops a report."],
    ["See how the report was built", "Watch every search, page and decision as it happens in the live agent log."],
  ] },
  { group: "Your keys, your models", items: [
    ["Bring your own keys", "Use your own OpenAI, Anthropic, Gemini or OpenRouter key. Pick a fast model for the legwork and a strong one for the writing."],
    ["Jev is optional", "No OpenRouter key? A built-in decision agent gives the same scores with the key you already have."],
  ] },
  { group: "Fits your workflow", items: [
    ["Signals and watchlist", "Verified findings from every run in one feed. Companies join your watchlist as they come up."],
    ["Exports", "Download Markdown per company or the raw JSON, or print to PDF."],
    ["Keyboard first", "Ctrl K to start anything, number keys to switch views, j and k to move through lists."],
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
  ["What is MKT·INTEL?", "An AI market research agent. Ask about your market, a competitor or a trend, and agents research the live web, verify each claim and write a sourced report with recommended actions."],
  ["Which markets does it cover?", "Any market with a public web presence: software, consumer brands, retail, fintech, health and more. It works best where companies publish pricing, product pages and news."],
  ["How is it different from a chatbot with web search?", "Every finding is checked by a typed decision engine (Jev) that scores whether it is real, what kind of change it is, how big the impact is and how strong the evidence is. Weak evidence triggers more research instead of a confident guess."],
  ["Which sources does it use?", "Live web search and full-page reads through Context.dev, Tavily and Firecrawl. It starts with official pricing pages, product pages, docs and blogs, then review sites, industry reports and credible news. Social media reposts are filtered out."],
  ["How long does a report take?", "About a minute for a quick brief, and two to three minutes for a full competitor profile, pricing teardown or battlecard."],
  ["Is it free?", "Yes. Create an account and run reports on the platform keys, or add your own keys to choose the models."],
  ["Can I use my own API keys and models?", "Yes. Add an OpenAI, Anthropic, Gemini or OpenRouter key and pick a fast model for planning and a strong model for the report. Keys are encrypted at rest and never sent to the browser."],
  ["Do I need a Jev subscription?", "No. With an OpenRouter key you get Jev. Without one, decisions run on a built-in decision agent using your own key, with the same checks and output."],
  ["Is it open source?", "Yes. The code is on GitHub, including the LangGraph agent, the FastAPI backend and this Next.js frontend."],
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
              <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight md:text-5xl xl:text-[54px]">
                Market research in minutes, <span className="text-amber">not weeks.</span>
              </h1>
              <p className="rise mt-5 max-w-[46ch] text-[17px] leading-relaxed text-dim" style={{ "--i": 1 } as React.CSSProperties}>
                Size up competitors, check pricing or spot trends in any market. Agents verify every claim and cite the source.
              </p>
              <div className="rise mt-8 flex flex-wrap items-center gap-5" style={{ "--i": 2 } as React.CSSProperties}>
                <Link href="/login" className="btn-amber h-11 px-5 text-[12px]">Run your first report <ArrowRight className="size-3.5" /></Link>
                <a href="#how" className="font-mono text-[12px] tracking-wider text-dim uppercase underline-offset-4 transition hover:text-fg hover:underline">See how it works</a>
              </div>
            </div>
            <Shot src="/screens/pricing-teardown.png" priority sizes="(min-width: 1024px) 60vw, 100vw" className="lg:-mr-40"
                  alt="Research view: live agent log, a pricing teardown of Shopify vs BigCommerce, and the sources inspector" />
          </div>
        </section>

        <section id="how" className="mx-auto max-w-[1400px] scroll-mt-16 px-4 py-20 md:py-24">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">How a question becomes a report you can trust</h2>
            <p className="mt-3 max-w-[65ch] text-[15px] leading-relaxed text-dim">Five agents split the work. If the evidence is thin, they go back for more before a word is written.</p>
          </div>
          <ol className="mt-12 grid gap-8 md:grid-cols-5 md:gap-0">
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
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">One question, four kinds of report</h2>
              <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed text-dim">Research your own product&apos;s market, a competitor, or a whole category. Pick the report before you run.</p>
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
            <Shot src="/screens/battlecard-ratings.png" sizes="(min-width: 1024px) 55vw, 100vw" className="reveal"
                  alt="Battlecard for HubSpot vs Salesforce: 1-5 ratings by category and a side-by-side pricing comparison" />
          </div>
        </section>

        <section className="mx-auto max-w-[1400px] px-4 py-20 md:py-24">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">The research, the report and every source on one screen</h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-3 lg:grid-rows-2">
            <Shot src="/screens/light.png" sizes="(min-width: 1024px) 64vw, 100vw" className="reveal lg:col-span-2"
                  alt="Competitor profile of Mistral AI and Cohere in the light theme, with a positioning map and key takeaways"
                  caption="Competitor profiles come with a positioning map. Light theme included." />
            <figure className="reveal lg:row-span-2">
              <div className="mx-auto max-w-[320px] overflow-hidden rounded-[22px] border border-line-2 bg-panel lg:max-w-none">
                <Image src="/screens/mobile.png" alt="The research view on a phone, with agent, brief and inspector tabs" width={390} height={844} sizes="(min-width: 1024px) 30vw, 320px" quality={90} className="h-auto w-full" />
              </div>
              <figcaption className="mt-2 text-center text-[13px] text-dim lg:text-left">The same report on a phone.</figcaption>
            </figure>
            <Shot src="/screens/palette.png" sizes="(min-width: 1024px) 64vw, 100vw" className="reveal lg:col-span-2"
                  alt="Command palette with research modes and playbooks, opened with Ctrl K"
                  caption="Press Ctrl K to start a run from anywhere." />
          </div>
        </section>

        <section id="features" className="scroll-mt-16 border-y border-line bg-panel">
          <div className="mx-auto grid max-w-[1400px] gap-12 px-4 py-20 md:py-24 lg:grid-cols-[1fr_2fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Built so you can check every claim</h2>
              <div className="mt-8 rounded-md border border-line bg-bg p-4 font-mono text-[12px]" aria-label="Example typed decision for one detected change">
                <p className="text-dim">Example: a competitor raises its entry price</p>
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
                <div key={g.group}>
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
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">How the system fits together</h2>
          <div className="mt-10 grid items-stretch gap-2 font-mono text-[12px] lg:grid-cols-[1fr_auto_1fr_auto_1.3fr]" role="img"
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

          <dl className="mt-14 grid gap-x-12 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
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
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Frequently asked questions</h2>
            <dl className="mt-10 grid gap-x-16 gap-y-10 md:grid-cols-2">
              {FAQ.map(([q, a]) => (
                <div key={q}><dt className="text-[16px] font-semibold">{q}</dt><dd className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-dim">{a}</dd></div>
              ))}
            </dl>
          </div>
        </section>

        <section className="border-t border-line">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-16 md:flex-row md:items-center md:justify-between md:py-20">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Find out what changed. Decide what to do.</h2>
              <p className="mt-2 text-[15px] text-dim">Create a free account and have your first report in minutes.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/login" className="btn-amber h-11 px-5 text-[12px]">Run your first report <ArrowRight className="size-3.5" /></Link>
              <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn h-11 px-5 text-[12px]">GitHub</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-4 py-6 font-mono text-[11px] text-faint">
          <Brand />
          <span>AI market research agent</span>
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
