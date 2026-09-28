// Illustrative agent log + wire used on the public pages (login, landing). Not real data.
export const DEMO_LOG = [
  ["00:03", "PLAN", "text-violet", "✓", "6 tasks · pricing, models, docs, changelog, news, competitors"],
  ["00:12", "WEB ", "text-info", "✓", "site:anthropic.com pricing — 5 src, 2 crawled"],
  ["00:19", "WEB ", "text-info", "!", "Context.dev out of credits → Tavily"],
  ["00:24", "WEB ", "text-info", "✓", "\"new model\" announcement — 5 src · via Tavily"],
  ["00:38", "EVID", "text-amber", "✓", "8 claims · 2 changes · 1 contradiction"],
  ["00:39", "JEV ", "text-up", "✓", "Opus pricing cut: real 92% · pricing · impact 87 → ALERT"],
  ["00:44", "SYNT", "text-violet", "✓", "brief ready"],
] as const;

export const DEMO_WIRE = [
  ["▲", "text-down", "ANTHROPIC", "PRICING", "87"],
  ["◆", "text-amber", "OPENAI", "MODEL", "64"],
  ["●", "text-up", "GOOGLE", "DOCS", "22"],
] as const;
