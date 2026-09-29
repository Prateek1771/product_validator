    # MKT·INTEL: AI market research agent

Users research a market, a competitor or a trend in any industry (positioning: general market research, not AI-only). A LangGraph agent plans the research, searches and crawls the web (Context.dev, falling back to Tavily and then Firecrawl), extracts claims (OpenAI), scores each detected change with **Jev** typed decisions (via OpenRouter), loops back when Jev says more evidence is needed, and writes a sourced brief. Progress streams live to a terminal-style Next.js UI. Auth and data live in InsForge.

```
backend/    FastAPI + LangGraph + LangChain (Python 3.12, uv)   -> Render (Docker, render.yaml)
frontend/   Next.js 16 App Router + Tailwind v4 + @insforge/sdk -> Vercel
docs/       ARCHITECTURE.md (as built) + original concept images
```

Deeper reference: `docs/ARCHITECTURE.md`.

## Commands

```bash
# backend (reads the root .env)
cd backend
uv sync
uv run uvicorn app.main:app --port 8000 --reload
uv run pytest                                     # graph loop + provider fallback, all external calls mocked
uv run python scripts/sql.py -f migrations/001_init.sql   # apply SQL to InsForge (admin key)
uv run python scripts/sql.py "select count(*) from research_runs"

# frontend (reads frontend/.env.local)
cd frontend
npm run dev -- -p 4317        # ports 3000/3100 are held by Docker on this machine
npx tsc --noEmit && npx eslint . && npx next build
```

Before calling a change done, run pytest, tsc, eslint and `next build`.

## Where things live

**Backend (`backend/app/`)**
- `graph.py`: `IntelligenceState`, the pydantic LLM output schemas, and the nodes `planner → researcher → evidence_analyst → decision_engine → (next_iteration → researcher) | synthesizer`. The `@node(name)` wrapper emits `node_start` / `node_end` / `log` events through `config["configurable"]["emit"]`. `recommend()` turns Jev scores into alert / investigate / monitor / ignore.
- `llm.py`: **LLM gateway.** `structured(schema, messages, role="fast"|"strong")` picks the provider and model from the user's saved choice when they have a key, otherwise the platform default (OpenAI **direct**: `OPENAI_LLM_MODEL` / `OPENAI_STRONG_MODEL`). If a user's key fails auth or quota, it falls back to the platform once.
- `keys.py`: **key vault.** User keys are Fernet-encrypted (`SECRETS_KEY`) in `user_keys`, and the model choice lives in `user_llm`. `candidates(provider)` returns the user key first, then the platform key. It also does live validation and live model lists. `keys.current` is the per-run ContextVar.
- `decisions.py`: `decide()` routes to **Jev** (when an OpenRouter key applies) or to the **LLM decision agent**, which emulates noul/choice/score with Jev-identical output shapes. The agent is used when the user brought a non-OpenRouter LLM key, and as a fallback whenever Jev errors.
- `tools.py`: **the only module that calls external data providers.** It holds the `SEARCH` and `SCRAPE` fallback chains, `_chain()`, the credit breaker (`NoCredits`, 401/402), `jev()` and the question builders `noul()`, `choice()`, `score()`.
- `usage.py`: in-process counters, `exhausted_until`, and ContextVars that carry per-run usage and the emitter.
- `main.py`: `POST /research`, `GET /research/{id}/events` (SSE, replays the stored timeline), `GET /system`, the `RUNS` registry, `persist()` and `execute()`.
- `auth.py`: validates the InsForge access token via `GET /api/auth/sessions/current`.
- `db.py`: InsForge records API (PostgREST) using the admin `INSFORGE_API_KEY`.
- `config.py`: pydantic-settings. It also `load_dotenv`s the root `.env` so libraries that read `os.environ`, such as LangSmith, see it.

**Frontend (`frontend/`)**
- `lib/api.ts`: browser → FastAPI with the `insforge_access_token` cookie as Bearer, retrying once after `/api/auth/refresh`. `streamEvents()` is SSE over fetch, because EventSource can't send headers.
- `components/research/useRun.ts`: reducer that folds the event stream into the view state. `AgentLog`, `Brief` and `Inspector` render it, and `ResearchLayout` is pure, so it can render fixture state.
- `components/term.tsx`: design primitives (`Panel`, `Tag`, `Blocks`, `StatTile`, `ImpactTag`, `ActionTag`, `Brand`, `PageTitle`, `Empty`, `Favicon`).
- `components/shell/`: `TopBar`, `Ticker`, `Rail`, `CommandPalette` (native `<dialog>`, Ctrl+K or `/`) and `ThemeToggle`. Nav items and hotkeys are in `lib/nav.ts` and `lib/useHotkeys.ts`.
- `app/(app)/*`: authed pages. Server Components read InsForge via `serverClient()` (RLS-scoped). `app/login/actions.ts` holds every auth mutation (server actions).
- `proxy.ts`: InsForge `updateSession`. Next 16 calls middleware "proxy".

## Rules and gotchas

- **Next.js 16 is not the Next you know.** Read `frontend/node_modules/next/dist/docs/` before using an API (see `frontend/AGENTS.md`). `params` and `searchParams` are Promises, and middleware is now `proxy.ts`.
- **Tailwind v4:** define reusable classes with `@utility` in `app/globals.css`. Global element selectors must sit inside `@layer base`, or they override utility classes.
- **Design tokens:** `bg`, `panel`, `panel-2`, `hover`, `line`, `line-2`, `fg`, `dim`, `faint`, `amber`, `up`, `down`, `info`, `violet` (each with a `-soft` variant). The theme is `data-theme` (`dark` | `light` | `system`) on `<html>`, set before paint by an inline script. Don't use the old tokens (`surface`, `accent`, `muted`, `subtle`); they no longer exist. Numbers and labels use `font-mono`, prose uses `font-sans` (IBM Plex).
- **LangGraph:** don't use `functools.wraps` in the node wrapper. LangGraph reads the signature to decide whether to pass `config`.
- **Context.dev:** `num_results` must be ≥ 10. Each search or scrape costs 1 credit; the free tier has 250.
- **Jev:** call `POST https://openrouter.ai/api/alpha/decisions` (chat completions rejects it). `questions` is a dict of `{type: noul|choice|score, instructions, criteria}`. A score answer is a level index, so use `score_pct()` for 0–100.
- **LLM:** always go through `llm.structured()`; never construct chat models in nodes. The platform LLM is OpenAI direct, and OpenRouter is only used for Jev or when a user picks OpenRouter models. `LLM_BASE_URL` no longer exists.
- **Output cap:** if a structured call hits the model's output limit (`LengthFinishReasonError`), `llm.structured()` retries it once with a "be concise" system message (`CONCISE`). Long pricing pages trigger this.
- **BYOK tables** (`user_keys`, `user_llm`): RLS is on with **no policies** and all grants are revoked, so only the backend admin key can touch them. Never return `key_enc` or plaintext keys from an endpoint; the browser only ever sees `hint`. Rotating `SECRETS_KEY` makes stored user keys unreadable (they are treated as unset).
- **Deploy:** the backend runs on Render from the root `render.yaml` Blueprint (Docker, `rootDir: backend`, `/health`). The frontend runs on Vercel from `frontend/`.
- **One backend replica.** `RUNS` and the `usage` meters live in memory. Moving to Redis would be needed before scaling out.
- **Secrets:** the root `.env` is for the backend and `frontend/.env.local` for the frontend. `INSFORGE_API_KEY` is a full admin key: server-only, never `NEXT_PUBLIC_*`. The frontend only gets the anon key.
- **DB:** the schema lives in `backend/migrations/*.sql`. RLS gives `authenticated` users read access to their own rows only; the backend writes everything with the admin key. Users can update only `reports.saved` and their own `companies`. New tables need `user_id`, RLS and a select policy.

## Adding things

- **Graph node:** write the function in `graph.py` under `@node("name")`, add it to `STATUS`, wire its edges in `build_graph()`, and add a `CODE` entry in `frontend/components/research/AgentLog.tsx`.
- **Web provider:** write `_search_x(c, key, byok, ...)` / `_scrape_x` in `tools.py`, then add it to `SEARCH` / `SCRAPE`, `client()` and `NAMES`. Register it in `keys.py` (`WEB_PROVIDERS`, `platform_key`, `VALIDATE`), add it to the migration's provider check, and to `/system` in `main.py` and `WEB` in `SettingsView.tsx`.
- **LLM provider:** add a branch to `llm.chat()`, entries in `keys.LLM_PROVIDERS`, `MODEL_ENDPOINTS` and `_parse_models`, a new migration widening the provider checks, and a row in `LLM` in `SettingsView.tsx`.
- **Playbook:** register a `Playbook` in `backend/app/playbooks.py`. It needs:
  - a planner hint
  - a `company_schema` (one call per company) and a `summary_schema`, both pydantic with lists only, since OpenAI strict mode rejects dicts. `company_schema=None` makes it summary-only (one call)
  - their prompts
  - `to_markdown` and, optionally, `company_markdown` for per-company downloads
  - depth settings (`**DEEP`)
  - `coverage` (topic groups for the methodology meter) and, when numbers are derived, a `post` function. Compute maths there; never trust LLM arithmetic

  Add its id to `ResearchIn.playbook` in `main.py` and to a migration that widens the `research_runs.playbook` check. On the frontend, add it to `lib/playbooks.ts`, its type to `lib/types.ts`, and a view in `components/research/Deliverable.tsx`, reading fields through `arr()` / `txt()` so older reports still render. Add its charts to `deliverableCharts` and its sheets to `tablesFor` in `lib/report-model.ts`; the UI, the PDF, the PPTX and the XLSX all read from there.
- **Chart formats:** use `toLocaleString("en-US")` / a fixed locale in anything rendered on the server, or hydration fails on machines whose locale is not en-US. Grid cells that hold charts or tables need `min-w-0`.
- **Page:** create `app/(app)/<route>/page.tsx` using `PageTitle` + `Panel`, then add a `lib/nav.ts` entry, which also gives it a hotkey and a palette entry.
- **Column or table:** create a new `migrations/00N_*.sql` and apply it with `scripts/sql.py`. Don't edit applied migrations.

## Positioning and copy

- **Positioning:** MKT·INTEL is an **AI market research agent for any industry**. It covers your own product's market, competitors and market trends, and it is not an AI-industry tracker. Copy, example prompts, SEO metadata (`lib/site.ts`, `app/layout.tsx`, `manifest.ts`, `opengraph-image.tsx`, `public/llms.txt`) and agent prompts (`graph.py` planner, `MODE_HINT`, `CHANGE_QUESTIONS`) stay industry-neutral. Use multi-industry examples (Shopify vs BigCommerce, Notion/Coda, HubSpot vs Salesforce, home fitness trends).
- **Copy rules** (from `.agents/skills/copywriting`):
  - Write in customer language, benefit first, with plain verbs.
  - CTAs are action plus outcome ("Run your first report").
  - No exclamation marks, no buzzwords, no false or fake-precise claims. Run-time claims must match measured runs (about 1 min for a brief, 2-3 min for a playbook).
- **Design rules** (from `.agents/skills/design-taste-frontend` and `redesign-existing-projects`):
  - No em or en dashes anywhere in the UI or in generated reports.
  - No eyebrow labels above landing sections, and no decorative dots, grid lines or glows.
  - One accent colour (amber). Violet is reserved for the `investigate` action.
  - The hero H1 fits on 2 lines and the subtext is 20 words or fewer.
  - Landing screenshots are real component renders, never div mock-ups. They live in `frontend/public/screens/`: give a changed shot a new filename, because the image optimiser caches by path.
  - Scroll reveal (`.reveal`) goes on images only, never on text, because half-faded text fails Lighthouse contrast.

## Marketing skills

`.claude/skills/` holds skills installed from `coreyhaines31/marketingskills` (competitor-profiling, competitors, pricing, customer-research, programmatic-seo, schema, cro, analytics). They are reference frameworks: the playbooks distil `competitor-profiling`, `pricing` and `competitors`. Read the relevant one before changing a playbook's prompt or schema.

## UI verification

Authed pages need a real InsForge session. To check them visually, add a temporary `app/preview-tmp/page.tsx` that renders the components with fixture data (for example `ResearchLayout` with a hand-built `RunState`), screenshot it with the Puppeteer MCP at 1440 and 390 widths in both themes, then **delete the route**.
