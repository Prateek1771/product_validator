import asyncio
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from collections import Counter

import httpx

from . import db, decisions, keys, llm, tools, usage
from .auth import current_user
from .config import settings
from .graph import graph

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("api")

app = FastAPI(title="Market Intelligence API")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
                   allow_methods=["*"], allow_headers=["*"])


@dataclass
class Run:
    user_id: str
    events: list[dict] = field(default_factory=list)
    done: bool = False
    task: asyncio.Task | None = None  # held so the event loop doesn't GC a running job
    changed: asyncio.Condition = field(default_factory=asyncio.Condition)


# ponytail: in-process run registry, single Railway replica. Move to Redis pub/sub before scaling out.
RUNS: dict[str, Run] = {}


class ResearchIn(BaseModel):
    query: str = Field(min_length=3, max_length=2000)
    mode: Literal["deep", "web", "company", "market"] = "deep"


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def slim(update: dict) -> dict:
    """Timeline payloads go to the browser; drop full page bodies."""
    if "sources" in update:
        update = {**update, "sources": [{k: v for k, v in s.items() if k != "content"} | {"crawled": bool(s.get("content"))}
                                        for s in update["sources"]]}
    return update


async def persist(run_id: str, user_id: str, s: dict) -> str:
    own = {"run_id": run_id, "user_id": user_id}
    await db.insert("sources", [{**own, **{k: x.get(k) for k in ("url", "title", "type", "snippet", "content")}} for x in s.get("sources", [])])
    await db.insert("evidence", [{**own, **{k: e.get(k) for k in ("claim", "source_url", "source_type", "entity", "topic",
                                                                  "excerpt", "published_at", "reliability")}} for e in s.get("evidence", [])])
    await db.insert("changes", [{**own, "company": c.get("company"), "title": c["title"], "summary": c.get("summary"),
                                 "change_type": c.get("change_type"), "impact_score": c.get("impact_score"),
                                 "confidence": c.get("confidence"), "is_real_change": c.get("is_real_change"),
                                 "recommended_action": c.get("recommended_action"),
                                 "decision": {k: c.get(k) for k in ("decision", "evidence_quality", "affected", "claim_ids", "published_at")}}
                                for c in s.get("changes", [])])
    if s.get("entities"):
        await db.insert("companies", [{"user_id": user_id, "name": e["name"], "domain": e.get("domain")} for e in s["entities"]],
                        upsert_on="user_id,name")
    r = s["report"]
    [row] = await db.insert("reports", {**own, "title": r["title"], "content_md": r["markdown"],
                                        "summary": {k: v for k, v in r.items() if k != "markdown"}})
    return row["id"]


async def execute(run_id: str, query: str, mode: str):
    run = RUNS[run_id]

    async def emit(ev: dict):
        ev = {"t": time.time(), **ev}
        if "update" in ev:
            ev["update"] = slim(ev["update"])
        async with run.changed:
            run.events.append(ev)
            run.changed.notify_all()
        if ev["type"] == "node_start":
            await db.update("research_runs", run_id, {"status": ev["status"], "state": {"timeline": run.events}, "updated_at": now()})

    spent = Counter()
    keys.current.set(await keys.load(run.user_id))  # BYOK: user keys + model choice for this run
    usage.run_counter.set(spent)
    usage.run_emit.set(emit)
    t0 = time.time()
    try:
        final = await graph.ainvoke({"user_request": query, "mode": mode}, config={
            "configurable": {"emit": emit}, "recursion_limit": 40,
            "run_name": "research", "tags": [mode], "metadata": {"run_id": run_id, "user_id": run.user_id}})  # LangSmith
        report_id = await persist(run_id, run.user_id, final)
        await emit({"type": "done", "report_id": report_id})
        await db.update("research_runs", run_id, {"status": "complete", "updated_at": now(), "state": {
            "timeline": run.events, "entities": final.get("entities"), "plan": final.get("research_plan"),
            "decisions": final.get("decisions"), "iterations": final.get("iteration", 0),
            "models": final.get("models"), "decider": final.get("decider"),
            "usage": dict(spent), "duration": round(time.time() - t0, 1)}})
    except Exception as e:
        log.exception("run %s failed", run_id)
        await emit({"type": "error", "message": str(e)[:500]})
        await db.update("research_runs", run_id, {"status": "failed", "error": str(e)[:2000], "updated_at": now(), "state": {
            "timeline": run.events, "usage": dict(spent), "duration": round(time.time() - t0, 1)}})
    finally:
        async with run.changed:
            run.done = True
            run.changed.notify_all()


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/research")
async def start_research(body: ResearchIn, user: dict = Depends(current_user)):
    [row] = await db.insert("research_runs", {"user_id": user["id"], "query": body.query, "mode": body.mode})
    RUNS[row["id"]] = Run(user_id=user["id"])
    RUNS[row["id"]].task = asyncio.create_task(execute(row["id"], body.query, body.mode))
    return {"id": row["id"]}


@app.get("/research/{run_id}/events")
async def research_events(run_id: str, user: dict = Depends(current_user)):
    run = RUNS.get(run_id)
    if run is None:  # finished before this process started: replay the stored timeline
        rows = await db.select("research_runs", id=f"eq.{run_id}", user_id=f"eq.{user['id']}")
        if not rows:
            raise HTTPException(404, "Run not found")
        run = Run(user_id=user["id"], events=rows[0]["state"].get("timeline", []), done=True)
        if rows[0]["status"] not in ("complete", "failed"):
            run.events.append({"type": "error", "message": "Run was interrupted by a server restart"})
    if run.user_id != user["id"]:
        raise HTTPException(404, "Run not found")

    async def stream():
        i = 0
        while True:
            async with run.changed:
                await run.changed.wait_for(lambda: i < len(run.events) or run.done)
                batch, finished = run.events[i:], run.done
            for ev in batch:
                yield {"data": json.dumps(ev, default=str)}
            i += len(batch)
            if finished and i >= len(run.events):
                return

    return EventSourceResponse(stream(), ping=15)


_http = httpx.AsyncClient(timeout=10)


async def _balance(url: str, key: str | None, pick) -> dict | None:
    """Live credit balance from a provider's account API; None when unavailable."""
    if not key:
        return None
    try:
        r = await _http.get(url, headers={"Authorization": f"Bearer {key}"})
        r.raise_for_status()
        return pick(r.json())
    except Exception:
        return None


@app.get("/system")
async def system(user: dict = Depends(current_user)):
    t = usage.totals

    def meter(p: str, op: str) -> dict:
        return {k: t[f"{p}.{op}{s}"] for k, s in (("calls", ""), ("failures", ".fail"), ("fallbacks", ".fallback"))}

    def status(p: str) -> str:
        if not tools.configured(p):
            return "not_configured"
        if tools.platform_exhausted(p):
            return "exhausted"
        return "erroring" if p in usage.last_error and t[f"{p}.search.fail"] + t[f"{p}.scrape.fail"] > t[f"{p}.search"] // 2 else "ok"

    openrouter, firecrawl, tavily = await asyncio.gather(
        _balance("https://openrouter.ai/api/v1/credits", settings.openrouter_api_key,
                 lambda d: {"remaining_usd": round(d["data"]["total_credits"] - d["data"]["total_usage"], 4),
                            "total_usd": d["data"]["total_credits"]}),
        _balance("https://api.firecrawl.dev/v2/team/credit-usage", settings.firecrawl_api_key,
                 lambda d: {"remaining": d["data"]["remainingCredits"], "total": d["data"].get("planCredits")}),
        _balance("https://api.tavily.com/usage", settings.tavily_api_key,
                 lambda d: {"used": d["account"]["plan_usage"], "total": d["account"].get("plan_limit")}),
    )
    providers = [
        {"id": p, "name": tools.NAMES[p], "role": "Web search & crawl", "status": status(p),
         "search": meter(p, "search"), "scrape": meter(p, "scrape"), "last_error": usage.last_error.get(p),
         "exhausted_until": usage.exhausted_until.get(keys.slot(p, keys.platform_key(p))) if tools.platform_exhausted(p) else None,
         "credits": {"context": {"remaining": usage.credits_left.get("context"), "total": 250} if "context" in usage.credits_left else None,  # ponytail: 250 = free tier; API exposes no plan total
                     "firecrawl": firecrawl, "tavily": tavily}[p]}
        for p in ("context", "tavily", "firecrawl")
    ]
    providers.append({"id": "jev", "name": "Jev (OpenRouter)", "role": "Typed decisions", "credits": openrouter,
                      "status": "erroring" if "jev" in usage.last_error and t["jev.decide.fail"] else "ok",
                      "decide": {"calls": t["jev.decide"], "failures": t["jev.decide.fail"]},
                      "cost_usd": t["jev.cost_micro"] / 1e6, "last_error": usage.last_error.get("jev")})
    runs = await db.select("research_runs", user_id=f"eq.{user['id']}", order="created_at.desc", limit="20",
                           select="id,query,mode,status,created_at,updated_at,state->usage,state->duration")
    chain = [p for p, _ in tools.SEARCH if tools.configured(p) and not tools.platform_exhausted(p)]
    llms = [{"id": p, "name": llm.NAMES[p], "calls": t[f"llm.{p}.calls"], "byok": t[f"llm.{p}.byok"], "tokens": t[f"llm.{p}.tokens"],
             "failures": t[f"llm.{p}.call.fail"], "platform": bool(keys.platform_key(p))} for p in keys.LLM_PROVIDERS]
    return {"uptime": round(time.time() - usage.STARTED), "active_runs": sum(1 for r in RUNS.values() if not r.done),
            "search_chain": [p for p, _ in tools.SEARCH], "active_provider": chain[0] if chain else None,
            "langsmith": bool(settings.langsmith_tracing), "providers": providers, "runs": runs,
            "llm": {"default": llm.platform_route("fast").label(), "providers": llms},
            "decisions": {"jev": t["decide.jev"], "llm": t["decide.llm"]}}


# ---------- BYOK settings ----------
KEY_LINKS = {"openai": "https://platform.openai.com/api-keys", "anthropic": "https://console.anthropic.com/settings/keys",
             "google": "https://aistudio.google.com/apikey", "openrouter": "https://openrouter.ai/settings/keys",
             "context": "https://context.dev", "tavily": "https://app.tavily.com", "firecrawl": "https://www.firecrawl.dev/app/api-keys"}


def _provider(p: str) -> str:
    if p not in keys.PROVIDERS:
        raise HTTPException(404, f"Unknown provider {p}")
    return p


async def _settings_payload(user_id: str) -> dict:
    cfg = await keys.load(user_id)
    token = keys.current.set(cfg)  # resolve() / engine() read the user's config
    try:
        fast, strong, engine = llm.resolve("fast"), llm.resolve("strong"), decisions.engine()
    finally:
        keys.current.reset(token)
    notice = None
    if engine == "llm" and cfg.has_llm_key:
        via = next(llm.NAMES[p] for p in keys.LLM_PROVIDERS if cfg.key(p))
        notice = (f"No OpenRouter key: Jev isn't available on your plan, so decisions run as an LLM decision agent on your {via} key "
                  "with the same checks (real change, type, impact, evidence quality). Add an OpenRouter key to use Jev and unlock every model.")
    return {
        "keys": await keys.listing(user_id),
        "platform": {p: keys.platform_key(p) is not None for p in keys.PROVIDERS},
        "links": KEY_LINKS,
        "llm": cfg.llm,
        "effective": {"fast": fast.label(), "strong": strong.label(), "provider": fast.provider, "byok": fast.byok},
        "decider": {"engine": engine, "notice": notice},
        "defaults": {"provider": "openai", "fast_model": settings.openai_llm_model, "strong_model": settings.openai_strong_model},
    }


@app.get("/settings")
async def get_settings(user: dict = Depends(current_user)):
    return await _settings_payload(user["id"])


class KeyIn(BaseModel):
    key: str = Field(min_length=8, max_length=500)


@app.put("/settings/keys/{provider}")
async def put_key(provider: str, body: KeyIn, user: dict = Depends(current_user)):
    p, key = _provider(provider), body.key.strip()
    ok = await keys.validate(p, key)
    if ok is False:
        raise HTTPException(400, f"{p} rejected this key. Check it and try again.")
    await keys.save_key(user["id"], p, key, verified=bool(ok))
    return await _settings_payload(user["id"])


@app.delete("/settings/keys/{provider}")
async def del_key(provider: str, user: dict = Depends(current_user)):
    p = _provider(provider)
    await keys.delete_key(user["id"], p)
    cfg = await keys.load(user["id"])
    if cfg.llm and cfg.llm["provider"] == p and not keys.platform_key(p):  # model choice no longer usable
        await keys.delete_llm(user["id"])
    return await _settings_payload(user["id"])


@app.get("/settings/models/{provider}")
async def get_models(provider: str, user: dict = Depends(current_user)):
    p = _provider(provider)
    if p not in keys.LLM_PROVIDERS:
        raise HTTPException(400, "Not an LLM provider")
    cfg = await keys.load(user["id"])
    key = cfg.key(p) or keys.platform_key(p)
    if not key:
        raise HTTPException(400, f"Add a {llm.NAMES[p]} key first")
    try:
        return {"provider": p, "models": await keys.list_models(p, key)}
    except httpx.HTTPError as e:
        raise HTTPException(502, f"Could not list {llm.NAMES[p]} models: {e}") from e


class LlmIn(BaseModel):
    provider: Literal["openai", "anthropic", "google", "openrouter"]
    fast_model: str = Field(min_length=1, max_length=200)
    strong_model: str = Field(min_length=1, max_length=200)


@app.put("/settings/llm")
async def put_llm(body: LlmIn, user: dict = Depends(current_user)):
    cfg = await keys.load(user["id"])
    if not (cfg.key(body.provider) or keys.platform_key(body.provider)):
        raise HTTPException(400, f"Add a {llm.NAMES[body.provider]} key first")
    await keys.save_llm(user["id"], body.provider, body.fast_model.strip(), body.strong_model.strip())
    return await _settings_payload(user["id"])


@app.delete("/settings/llm")
async def del_llm(user: dict = Depends(current_user)):
    await keys.delete_llm(user["id"])
    return await _settings_payload(user["id"])
