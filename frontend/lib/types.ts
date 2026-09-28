export type Mode = "deep" | "web" | "company" | "market";
export type NodeName = "planner" | "researcher" | "evidence_analyst" | "decision_engine" | "synthesizer";

export type Source = { provider?: "context" | "tavily" | "firecrawl"; url: string; title: string; snippet: string; relevance: "high" | "medium" | "low"; type: string; crawled?: boolean };
export type Evidence = {
  claim: string; source_url: string | null; source_type: string | null; entity: string; topic: string;
  excerpt: string; published_at: string | null; reliability: number;
};
type JevAnswer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; confidence: number; probabilities: Record<string, number> }
  | { type: "score"; score: number; confidence: number; probabilities: Record<string, number>; legend: Record<string, string> };
export type Change = {
  title: string; company: string; summary: string; claim_ids: number[]; published_at: string | null;
  is_real_change?: boolean; confidence?: number; impact_score?: number; evidence_quality?: number;
  change_type?: string; affected?: string; recommended_action?: "alert" | "investigate" | "monitor" | "ignore";
  decision?: Record<string, JevAnswer>;
};
export type Report = {
  title: string; executive_summary: string; why_it_matters: string; recommended_actions: string[]; markdown: string;
  highlights: { label: string; value: string; caption: string }[];
  key_changes: { change_index: number; headline: string; bullets: string[]; quote: string | null; quote_source: string | null }[];
};
export type Task = { topic: string; query: string; include_domains: string[]; freshness: string | null };

export type RunEvent = { t: number } & (
  | { type: "node_start"; node: NodeName; status: string; iteration: number }
  | { type: "node_end"; node: NodeName; elapsed: number; update: Record<string, unknown> }
  | { type: "log"; node: NodeName; message: string; level?: "warn"; urls?: string[]; query?: string }
  | { type: "done"; report_id: string }
  | { type: "error"; message: string }
);

type Meter = { calls: number; failures: number; fallbacks?: number };
export type ProviderStatus = {
  id: "context" | "tavily" | "firecrawl" | "jev"; name: string; role: string;
  status: "ok" | "exhausted" | "erroring" | "not_configured"; last_error: string | null; exhausted_until?: number | null;
  search?: Meter; scrape?: Meter; decide?: Meter; cost_usd?: number;
  credits: { remaining?: number | null; total?: number | null; used?: number; remaining_usd?: number; total_usd?: number } | null;
};
export type SystemStatus = {
  uptime: number; active_runs: number; search_chain: string[]; active_provider: string | null; langsmith: boolean;
  providers: ProviderStatus[];
  runs: { id: string; query: string; mode: string; status: string; created_at: string; usage: Record<string, number> | null; duration: number | null }[];
  llm: { default: string; providers: { id: string; name: string; calls: number; byok: number; tokens: number; failures: number; platform: boolean }[] };
  decisions: { jev: number; llm: number };
};

export type KeyProvider = "openai" | "anthropic" | "google" | "openrouter" | "context" | "tavily" | "firecrawl";
export type LlmProvider = "openai" | "anthropic" | "google" | "openrouter";
export type UserSettings = {
  keys: { provider: KeyProvider; hint: string; verified: boolean; updated_at: string }[];
  platform: Record<KeyProvider, boolean>;
  links: Record<KeyProvider, string>;
  llm: { provider: LlmProvider; fast_model: string; strong_model: string } | null;
  effective: { fast: string; strong: string; provider: LlmProvider; byok: boolean };
  decider: { engine: "jev" | "llm"; notice: string | null };
  defaults: { provider: "openai"; fast_model: string; strong_model: string };
};
export type ModelInfo = { id: string; name?: string | null; context?: number | null; structured?: boolean };
