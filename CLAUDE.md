    # MKT·INTEL — agentic market intelligence

Users ask what changed at an AI company. A LangGraph agent plans the research, searches and crawls the web (Context.dev, falling back to Tavily and then Firecrawl), extracts claims (OpenAI), scores each detected change with **Jev** typed decisions (via OpenRouter), loops back when Jev says more evidence is needed, and writes a sourced brief. Progress streams live to a terminal-style Next.js UI. Auth and data live in InsForge.

```
backend/    FastAPI + LangGraph + LangChain (Python 3.12, uv)   -> Railway
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
- **BYOK tables** (`user_keys`, `user_llm`): RLS is on with **no policies** and all grants are revoked, so only the backend admin key can touch them. Never return `key_enc` or plaintext keys from an endpoint; the browser only ever sees `hint`. Rotating `SECRETS_KEY` makes stored user keys unreadable (they are treated as unset).
- **One backend replica.** `RUNS` and the `usage` meters live in memory. Moving to Redis would be needed before scaling out.
- **Secrets:** the root `.env` is for the backend and `frontend/.env.local` for the frontend. `INSFORGE_API_KEY` is a full admin key: server-only, never `NEXT_PUBLIC_*`. The frontend only gets the anon key.
- **DB:** the schema lives in `backend/migrations/*.sql`. RLS gives `authenticated` users read access to their own rows only; the backend writes everything with the admin key. Users can update only `reports.saved` and their own `companies`. New tables need `user_id`, RLS and a select policy.

## Adding things

- **Graph node:** write the function in `graph.py` under `@node("name")`, add it to `STATUS`, wire its edges in `build_graph()`, and add a `CODE` entry in `frontend/components/research/AgentLog.tsx`.
- **Web provider:** write `_search_x(c, key, byok, ...)` / `_scrape_x` in `tools.py`, then add it to `SEARCH` / `SCRAPE`, `client()` and `NAMES`. Register it in `keys.py` (`WEB_PROVIDERS`, `platform_key`, `VALIDATE`), add it to the migration's provider check, and to `/system` in `main.py` and `WEB` in `SettingsView.tsx`.
- **LLM provider:** add a branch to `llm.chat()`, entries in `keys.LLM_PROVIDERS`, `MODEL_ENDPOINTS` and `_parse_models`, a new migration widening the provider checks, and a row in `LLM` in `SettingsView.tsx`.
- **Page:** create `app/(app)/<route>/page.tsx` using `PageTitle` + `Panel`, then add a `lib/nav.ts` entry, which also gives it a hotkey and a palette entry.
- **Column or table:** create a new `migrations/00N_*.sql` and apply it with `scripts/sql.py`. Don't edit applied migrations.

## UI verification

Authed pages need a real InsForge session. To check them visually, add a temporary `app/preview-tmp/page.tsx` that renders the components with fixture data (for example `ResearchLayout` with a hand-built `RunState`), screenshot it with the Puppeteer MCP at 1440 and 390 widths in both themes, then **delete the route**.
