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
  deliverable?: Deliverable;
  methodology?: Methodology;
};

export type Methodology = {
  sources_found: number; sources_read: number; claims: number; findings: number; verified: number; contradictions: string[]; rounds: number;
  providers: Record<string, number>; source_mix: Record<string, number>; coverage: { label: string; sources: number; pct: number }[];
  completeness: number; gaps: string[]; avg_reliability: number | null; entities: { name: string; domain: string | null }[];
};

// Mirrors backend/app/playbooks.py. Reports saved before the skill-template schemas lack most fields, so views read them defensively.
type Sourced = { point: string; source_url: string | null };
export type Row = { dimension: string; values: string[] };
export type CompanyProfile = {
  name: string; domain: string | null;
  at_a_glance: { tagline: string; founded: string; headquarters: string; team_size: string; funding: string; starting_price: string; free_tier: string };
  value_prop: { headline: string; subheadline: string }; target_audience: string; positioning_angle: string;
  messaging_themes: Sourced[]; capabilities: { name: string; description: string }[]; differentiators: string[];
  integrations: { count: string; key: string[] }; product_direction: string[];
  pricing: { tiers: { name: string; price: string; monthly_usd?: number | null; inclusions: string[] }[]; billing: string; free_trial: string; notable: string };
  social_proof: { named_customers: string[]; industries: string[]; case_study_themes: string[]; ratings: { site: string; rating: string; count: string }[] };
  review_themes: { theme: string; sentiment: "positive" | "negative" | "mixed"; quote: string | null; source_url: string | null }[];
  content_signals: { content_types: string[]; focus_areas: string[] };
  strengths: Sourced[]; weaknesses: Sourced[]; implications: { opportunities: string[]; threats: string[] };
  sources: { page: string; url: string }[];
  scorecard?: { dimension: string; score: number; note: string }[];
};
export type CompetitorProfiles = {
  companies: CompanyProfile[]; landscape: string; comparison: Row[]; takeaways: string[]; opportunities: string[];
  positioning_map: { x_axis: string; y_axis: string; points: { name: string; x: number; y: number }[]; interpretation: string[] };
};
export type Verdict = { dimension: string; verdict: "pass" | "partial" | "gap"; note: string };
export type CompanyPricing = {
  name: string; value_metric: string; pricing_model: string; free_tier: string; billing_options: string; annual_discount: string;
  tiers: { name: string; price: string; monthly_usd?: number | null; billing: string; limits: string; inclusions: string[]; is_anchor: boolean; notes?: string | null }[];
  enterprise: string; hidden_costs: string[];
  changes: { date: string | null; what: string; direction: "up" | "down" | "new" | "removed"; source_url?: string | null }[];
  rubric_human: Verdict[]; rubric_agent: Verdict[]; paste_test: string;
  fixes: { fix: string; impact: "high" | "medium" | "low"; effort: "high" | "medium" | "low"; why: string }[]; the_one_thing: string;
};
export type PricingTeardown = { companies: CompanyPricing[]; comparison: Row[]; cost_scenarios: (Row & { amounts_usd?: (number | null)[] })[]; insights: string[]; recommendation: string };
export type BattleSide = {
  name: string; ideal_customer: string; choose_if: string[]; pricing_summary: string;
  support: { documentation: string; channels: string; sla: string; onboarding: string };
  social_proof: { quote: string; who: string; source_url: string | null }[];
};
export type Battlecard = {
  companies: BattleSide[]; subject: string; competitor: string; tldr: string;
  category_comparisons: { category: string; subject: string; competitor: string; bottom_line: string }[];
  features: { category?: string; feature: string; subject: string; competitor: string }[];
  ratings: { dimension: string; subject: number; competitor: number; note: string }[];
  pricing: { rows: { item: string; subject: string; competitor: string }[]; total_cost: string; value_comparison: string };
  subject_wins: string[]; competitor_wins: string[];
  migration: { transfers: string[]; reconfigure: string[]; effort: string } | string;
  objections: { objection: string; response: string }[]; landmines: string[];
  proof_points: ({ point: string; source_url: string | null } | { claim: string; source_url: string | null })[];
};
export type Landscape = {
  market: string; overview: string; takeaways: string[];
  categories: { name: string; description: string; companies: { name: string; domain: string | null; one_liner: string; stage: "leader" | "challenger" | "emerging" | "niche" }[] }[];
  matrix: { dimensions: string[]; rows: { company: string; scores: number[] }[] };
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
  trends: { trend: string; direction: "up" | "down" | "flat"; evidence: string; source_url: string | null }[];
  emerging: { name: string; why: string }[]; stage_counts?: { stage: string; count: number }[];
};
export type CustomerPain = {
  subject: string; summary: string;
  themes: { theme: string; sentiment: "negative" | "mixed" | "positive"; mentions: number; severity: number; summary: string; share_pct?: number;
    quotes: { quote: string; where: string; source_url: string | null }[] }[];
  feature_requests: { request: string; mentions: number }[]; segments: { segment: string; main_pain: string }[];
  sentiment: { positive: number; neutral: number; negative: number }; sentiment_pct?: { positive: number; neutral: number; negative: number }; sentiment_basis?: "mentions" | "ratings";
  opportunity_gaps: { gap: string; evidence: string; idea: string }[];
};
export type SizeLevel = { value_usd: number; computed_usd?: number | null; check?: "ok" | "mismatch"; method: string;
  inputs: { label: string; value: number; unit: string; source_url: string | null }[] };
export type MarketSizing = {
  definition: string; geography: string; year: number; tam: SizeLevel; sam: SizeLevel; som: SizeLevel;
  growth: { cagr_pct: number | null; points: { year: number; value_usd: number; forecast: boolean; source_url: string | null }[] };
  scenarios: { case: "bear" | "base" | "bull"; year: number; value_usd: number; assumption: string }[]; confidence: number; caveats: string[];
};
export type Opportunity = {
  thesis: string; summary: string;
  segments: { segment: string; need: string; demand: number; competition: number; evidence: string; source_url: string | null; score?: number }[];
  gaps: { gap: string; why_now: string; target_user: string; evidence: string; source_url: string | null }[];
  competitors_to_watch: { name: string; threat: number; why: string }[];
  risks: { risk: string; likelihood: number; impact: number; mitigation: string }[];
  recommendation: { call: "go" | "conditional" | "no-go"; confidence: number; rationale: string; first_steps: string[] };
};
type DeliverableBase = { label: string; files?: { name: string; markdown: string }[] };
export type Deliverable = DeliverableBase & (
  | { playbook: "profile"; data: CompetitorProfiles }
  | { playbook: "pricing"; data: PricingTeardown }
  | { playbook: "battlecard"; data: Battlecard }
  | { playbook: "landscape"; data: Landscape }
  | { playbook: "pain"; data: CustomerPain }
  | { playbook: "sizing"; data: MarketSizing }
  | { playbook: "opportunity"; data: Opportunity });
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
