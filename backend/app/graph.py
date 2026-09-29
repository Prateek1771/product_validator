"""LangGraph workflow: planner -> researcher -> evidence_analyst -> decision_engine -(loop?)-> synthesizer."""
import asyncio
from collections import Counter
import time
from typing import Literal, TypedDict

from langchain_core.runnables import RunnableConfig
from langgraph.graph import END, START, StateGraph
from pydantic import BaseModel, Field

from . import decisions, llm, playbooks, tools
from .config import settings

Topic = Literal["pricing", "products", "models", "docs", "changelog", "news", "blog", "competitors", "market", "reviews", "forums", "other"]
ChangeType = ["pricing", "product", "model", "docs", "policy", "partnership", "other"]


class IntelligenceState(TypedDict, total=False):
    user_request: str
    mode: str                  # deep | web | company | market
    playbook: str              # brief | profile | pricing | battlecard (see playbooks.py)
    entities: list[dict]
    research_plan: list[dict]
    sources: list[dict]
    evidence: list[dict]
    contradictions: list[str]
    changes: list[dict]
    decisions: dict            # run-level Jev decisions (needs_more_research, ...)
    research_gaps: list[dict]
    models: dict               # {"fast": label, "strong": label} from the LLM gateway
    decider: str               # "jev" | "llm" (LLM decision agent)
    report: dict
    status: str
    iteration: int


# ---------- LLM output schemas ----------
class Entity(BaseModel):
    name: str
    domain: str | None = Field(description="Primary official domain, e.g. anthropic.com")


class Task(BaseModel):
    topic: Topic
    query: str = Field(description="Web search query. Google operators allowed.")
    include_domains: list[str] = Field(description="Official domains to restrict to; empty for open-web news/competitor queries")
    freshness: Literal["last_24_hours", "last_week", "last_month", "last_year"] | None


class Plan(BaseModel):
    entities: list[Entity]
    tasks: list[Task] = Field(description="3-6 focused research tasks (up to 8 when a PLAYBOOK asks for per-company coverage)")


class Claim(BaseModel):
    claim: str
    source_id: int = Field(description="The [n] id of the source document")
    entity: str
    topic: str
    excerpt: str = Field(description="Short verbatim quote supporting the claim")
    published_at: str | None
    reliability: float = Field(description="0-1: official source=high, reposts/rumor=low")


class Change(BaseModel):
    title: str = Field(description="e.g. 'Anthropic cut Claude Sonnet input pricing'")
    company: str
    summary: str
    claim_ids: list[int] = Field(description="Indexes into the claims list supporting this change")
    published_at: str | None


class EvidenceSet(BaseModel):
    claims: list[Claim]
    changes: list[Change] = Field(description="Distinct changes/events detected, most important first, max 8")
    contradictions: list[str]
    gaps: list[Task] = Field(description="Follow-up searches that would resolve missing or contradictory evidence; max 3")


class Highlight(BaseModel):
    label: str = Field(description="e.g. 'lower input cost'")
    value: str = Field(description="Big number/short value, e.g. '~50%' or '200K'")
    caption: str


class KeyChange(BaseModel):
    change_index: int
    headline: str
    bullets: list[str]
    quote: str | None
    quote_source: str | None


class Report(BaseModel):
    title: str
    executive_summary: str
    highlights: list[Highlight] = Field(description="Up to 4 KPI cards")
    key_changes: list[KeyChange]
    why_it_matters: str
    recommended_actions: list[str]


# ---------- plumbing ----------
STATUS = {"planner": "planning", "researcher": "researching", "evidence_analyst": "validating",
          "decision_engine": "deciding", "synthesizer": "synthesizing"}


async def _noop(_event: dict):
    pass


def _emitter(config: RunnableConfig):
    return (config.get("configurable") or {}).get("emit", _noop)


def node(name: str):
    """Emit start/end timeline events around a node."""
    def wrap(fn):
        async def run(state: IntelligenceState, config: RunnableConfig):
            emit = _emitter(config)
            t0 = time.monotonic()
            await emit({"type": "node_start", "node": name, "status": STATUS[name], "iteration": state.get("iteration", 0)})
            out = await fn(state, emit)
            await emit({"type": "node_end", "node": name, "elapsed": round(time.monotonic() - t0, 2), "update": out})
            return {**out, "status": STATUS[name]}
        run.__name__ = fn.__name__  # not functools.wraps: LangGraph must see the (state, config) signature
        return run
    return wrap


# ---------- nodes ----------
MODE_HINT = {
    "deep": "Thorough research: official pricing, product pages, docs, changelogs, blogs and credible news.",
    "web": "Quick web scan: 2-3 broad queries, prioritise recent news.",
    "company": "Company focus: everything that changed at the named company, official sources first.",
    "market": "Market analysis: trends, demand signals, key players, pricing and positioning across the market, including industry reports and credible news.",
}


@node("planner")
async def planner(state, emit):
    pb = playbooks.get(state.get("playbook"))
    plan: Plan = await llm.structured(Plan, [
        ("system", "You plan market research on companies, products and markets in any industry. Identify the companies and their "
                   "official domains, then break the request into focused web search tasks. Use include_domains with official domains "
                   "for pricing/product/docs/changelog/blog tasks; leave it empty for news, competitor, review and market tasks. For "
                   "trend or market questions, plan tasks for industry reports, market data, review sites and credible news. " + MODE_HINT[state.get("mode", "deep")]
                   + (" " + pb.planner_hint if pb.planner_hint else "")),
        ("user", state["user_request"]),
    ], role="fast")
    tasks = [t.model_dump() for t in plan.tasks[:pb.max_tasks]]
    models = {"fast": llm.resolve("fast").label(), "strong": llm.resolve("strong").label()}
    await emit({"type": "log", "node": "planner", "message": f"LLM · fast {models['fast']} · strong {models['strong']}"})
    await emit({"type": "log", "node": "planner", "message": f"Created research plan with {len(tasks)} steps"})
    return {"entities": [e.model_dump() for e in plan.entities], "research_plan": tasks, "iteration": 0, "models": models}


@node("researcher")
async def researcher(state, emit):
    tasks = state["research_plan"] if not state.get("iteration") else state.get("research_gaps", [])
    pb = playbooks.get(state.get("playbook"))
    seen = {s["url"] for s in state.get("sources", [])}

    async def run_task(task):
        await emit({"type": "log", "node": "researcher", "query": task["query"], "message": f"Searching: {task['query']}"})
        try:
            results = await tools.search(task["query"], task.get("include_domains") or None, task.get("freshness"))
        except Exception as e:
            await emit({"type": "log", "node": "researcher", "query": task["query"], "level": "warn", "message": f"Search failed: {e}"})
            return []
        fresh = [r for r in sorted(results, key=lambda r: {"high": 0, "medium": 1, "low": 2}[r["relevance"]]) if r["url"] not in seen][:pb.fresh_per_task]
        to_scrape = fresh[: pb.scrapes_per_task or settings.scrapes_per_task]
        contents = await asyncio.gather(*(tools.scrape(r["url"]) for r in to_scrape))
        for r, c in zip(to_scrape, contents):
            r["content"] = c
        await emit({"type": "log", "node": "researcher", "query": task["query"], "message": f"{len(fresh)} sources found, {sum(1 for c in contents if c)} crawled"
                               + (f" · via {tools.NAMES[results[0]['provider']]}" if results else ""),
                    "urls": [r["url"] for r in fresh]})
        return [{**r, "type": task["topic"], "content": r.get("content")} for r in fresh]

    batches = await asyncio.gather(*(run_task(t) for t in tasks))
    new = {}
    for s in (s for b in batches for s in b):
        new.setdefault(s["url"], s)  # dedupe across parallel tasks
    return {"sources": state.get("sources", []) + list(new.values())}


@node("evidence_analyst")
async def evidence_analyst(state, emit):
    pb = playbooks.get(state.get("playbook"))
    docs, budget = [], pb.evidence_budget
    for i, s in enumerate(state["sources"]):
        body = (s.get("content") or s.get("snippet") or "")[:pb.page_chars]
        chunk = f"[{i}] {s['title']} - {s['url']} (type: {s['type']})\n{body}\n"
        if budget - len(chunk) < 0:
            break
        budget -= len(chunk)
        docs.append(chunk)
    ev: EvidenceSet = await llm.structured(EvidenceSet, [
        ("system", "You are an evidence analyst. From the source documents extract atomic, verifiable claims relevant to the "
                   "request, cite the [n] source id, normalise numbers/dates, group claims into distinct changes, flag "
                   "contradictions between sources, and list follow-up searches for gaps. Only use facts in the documents. "
                   f"Extract at least {pb.min_claims} claims when the sources support it: every price, tier, limit, feature, "
                   "integration, customer, funding fact, review quote and date."),
        ("user", f"Request: {state['user_request']}\n\nSources:\n" + "\n".join(docs)),
    ], role="fast")
    srcs = state["sources"]
    evidence = [{**c.model_dump(exclude={"source_id"}),
                 "source_url": srcs[c.source_id]["url"] if 0 <= c.source_id < len(srcs) else None,
                 "source_type": srcs[c.source_id]["type"] if 0 <= c.source_id < len(srcs) else None}
                for c in ev.claims]
    await emit({"type": "log", "node": "evidence_analyst",
                "message": f"Extracted {len(evidence)} claims, {len(ev.changes)} changes, {len(ev.contradictions)} contradictions"})
    return {"evidence": evidence, "changes": [c.model_dump() for c in ev.changes[:8]],
            "contradictions": ev.contradictions, "research_gaps": [g.model_dump() for g in ev.gaps[:3]]}


def recommend(is_real: bool, confidence: int, impact: int) -> str:
    if not is_real:
        return "ignore"
    if confidence < 60:
        return "investigate"
    if impact > 70:
        return "alert"
    return "monitor" if impact >= 30 else "ignore"


CHANGE_QUESTIONS = {
    "is_real": tools.noul("Is this a real, verified change (not rumor, speculation or a stale repost)?",
                          "Supported by official or multiple credible sources with concrete details",
                          "Unsupported, speculative, contradicted, or only from low-reliability reposts"),
    "change_type": tools.choice("What type of change is this?", {
        "pricing": "Prices, plans, rate limits, credits or billing changed",
        "product": "New or changed product, feature, service or product line",
        "market": "Market trend, demand shift, regulation or competitive move",
        "docs": "Documentation, changelog or guidance update without product change",
        "policy": "Terms, usage policy, legal or safety policy change",
        "partnership": "Partnership, acquisition, funding or distribution deal",
        "other": "None of the above"}),
    "impact": tools.score("How big is the impact on customers and the market?",
                          ["negligible", "minor", "moderate", "major", "industry-shifting"]),
    "evidence_quality": tools.score("How strong is the supporting evidence?",
                                    ["none", "weak", "mixed", "strong", "conclusive official"]),
    "affected": tools.choice("Who is most affected?", {
        "customers": "End customers and users", "businesses": "Business buyers and partners",
        "developers": "Developers and technical buyers", "investors": "Investors and analysts",
        "competitors": "Rival companies"}),
}


@node("decision_engine")
async def decision_engine(state, emit):
    evidence = state["evidence"]
    engine = decisions.engine()
    await emit({"type": "log", "node": "decision_engine", "message": "Engine · Jev typed decisions" if engine == "jev"
                else f"Engine · LLM decision agent ({llm.resolve('fast').label()}); no OpenRouter key for Jev"})
    used = set()

    async def decide(change):
        claims = [evidence[i] for i in change.get("claim_ids", []) if 0 <= i < len(evidence)]
        a, eng = await decisions.decide({"request": state["user_request"], "change": change, "evidence": claims,
                                         "contradictions": state.get("contradictions", [])}, CHANGE_QUESTIONS)
        used.add(eng)
        p_real = a["is_real"]["noul"]
        real, impact = p_real >= 0.5, tools.score_pct(a["impact"])
        conf = round(100 * (p_real if real else 1 - p_real))
        return {**change, "decision": a, "is_real_change": real, "confidence": conf, "impact_score": impact,
                "evidence_quality": tools.score_pct(a["evidence_quality"]), "change_type": a["change_type"]["choice"],
                "affected": a["affected"]["choice"], "recommended_action": recommend(real, conf, impact)}

    changes = list(await asyncio.gather(*(decide(c) for c in state["changes"])))
    for c in changes:
        await emit({"type": "log", "node": "decision_engine",
                    "message": f"{c['title']}: {'real' if c['is_real_change'] else 'unverified'} ({c['confidence']}% confidence) · "
                               f"{c['change_type']} · impact {c['impact_score']} → {c['recommended_action']}"})

    more = {"noul": 0.0}
    budget = 0 if state.get("mode") == "web" else settings.max_iterations
    if state.get("research_gaps") and state.get("iteration", 0) < budget:
        more = (await decisions.decide({
            "request": state["user_request"],
            "changes": [{k: c[k] for k in ("title", "confidence", "impact_score", "evidence_quality", "is_real_change")} for c in changes],
            "contradictions": state.get("contradictions", []), "gaps": [g["query"] for g in state["research_gaps"]],
            "sources": len(state["sources"])},
            {"needs_more": tools.noul("Is more research needed before a reliable report can be written?",
                                      "Key claims are unverified, contradicted, or the request is not yet answered",
                                      "Evidence is sufficient to answer the request confidently")}))[0]["needs_more"]
    await emit({"type": "log", "node": "decision_engine",
                "message": f"Needs more research? {'Yes' if more['noul'] > 0.5 else 'No'} ({round(more['noul'] * 100)}%)"})
    return {"changes": changes, "decisions": {"needs_more_research": more["noul"]},
            "decider": "jev" if used == {"jev"} or (not used and engine == "jev") else "llm"}


def route_after_decision(state) -> str:
    return "researcher" if state.get("decisions", {}).get("needs_more_research", 0) > 0.5 else "synthesizer"


async def bump_iteration(state):
    return {"iteration": state.get("iteration", 0) + 1}


@node("synthesizer")
async def synthesizer(state, emit):
    changes = [{"index": i, **{k: c.get(k) for k in ("title", "company", "summary", "change_type", "impact_score", "confidence",
                                                     "is_real_change", "recommended_action", "affected", "published_at")},
                "evidence": [state["evidence"][j] for j in c.get("claim_ids", []) if 0 <= j < len(state["evidence"])]}
               for i, c in enumerate(state["changes"])]
    report: Report = await llm.structured(Report, [
        ("system", "You are a market-intelligence analyst writing a crisp executive briefing. Use only the verified changes "
                   "and evidence given. Lead with what changed, quantify it, explain why it matters, recommend actions. "
                   "Changes where is_real_change is false are unverified: mention them only as 'Unverified:' with the "
                   "caveat, never as fact. Quote sources verbatim when you quote. Plain text, no em dashes: use commas, colons or parentheses."),
        ("user", f"Request: {state['user_request']}\n\nChanges with Jev decisions and evidence:\n{changes}"),
    ], role="strong")
    r = report.model_dump()
    r["markdown"] = to_markdown(r, state["changes"])
    pb = playbooks.get(state.get("playbook"))
    r["methodology"] = methodology(state, pb)
    if pb.summary_schema:
        await emit({"type": "log", "node": "synthesizer", "message": f"Building {pb.label.lower()}: one analyst per company, then a summary"})
        data = await playbooks.build(pb, state, changes)
        r["deliverable"] = {"playbook": pb.id, "label": pb.label, "data": data, "files": playbooks.files(pb, data)}
        r["markdown"] += "\n\n" + pb.to_markdown(data)
    return {"report": r}


def methodology(state: dict, pb) -> dict:
    """How the research was done, computed from the graph state (no LLM): counts, sources, coverage, gaps."""
    sources, evidence, changes = state.get("sources", []), state.get("evidence", []), state.get("changes", [])
    mix = Counter(s.get("type") or "other" for s in sources)
    coverage = []
    for label, topics in pb.coverage or playbooks.BRIEF_COVERAGE:
        n = sum(mix[t] for t in topics)
        coverage.append({"label": label, "sources": n, "pct": min(100, round(100 * n / 3))})  # ponytail: 3 sources = covered
    rel = [e["reliability"] for e in evidence if isinstance(e.get("reliability"), (int, float))]
    return {
        "sources_found": len(sources), "sources_read": sum(1 for s in sources if s.get("content")),
        "claims": len(evidence), "findings": len(changes), "verified": sum(1 for c in changes if c.get("is_real_change")),
        "contradictions": state.get("contradictions", []), "rounds": state.get("iteration", 0) + 1,
        "providers": dict(Counter(s.get("provider") or "unknown" for s in sources)), "source_mix": dict(mix),
        "coverage": coverage, "completeness": round(sum(c["pct"] for c in coverage) / len(coverage)) if coverage else 0,
        "gaps": [g["query"] for g in state.get("research_gaps", [])]
                + [f"No {c['label'].lower()} found" for c in coverage if not c["sources"]],
        "avg_reliability": round(sum(rel) / len(rel), 2) if rel else None,
        "entities": [{"name": e.get("name"), "domain": e.get("domain")} for e in state.get("entities", [])],
    }


def to_markdown(r: dict, changes: list[dict]) -> str:
    out = [f"# {r['title']}", "", "## Executive summary", r["executive_summary"], ""]
    out += [f"- **{h['value']}** {h['label']} - {h['caption']}" for h in r["highlights"]]
    out += ["", "## Key changes"]
    for i, k in enumerate(r["key_changes"], 1):
        c = changes[k["change_index"]] if 0 <= k["change_index"] < len(changes) else {}
        out += ["", f"### {i}. {k['headline']}" + (f" (impact {c.get('impact_score')}/100)" if c else "")]
        out += [f"- {b}" for b in k["bullets"]]
        if k.get("quote"):
            out += ["", f"> {k['quote']}" + (f" - {k['quote_source']}" if k.get("quote_source") else "")]
    out += ["", "## Why it matters", r["why_it_matters"], "", "## Recommended actions"]
    out += [f"- {a}" for a in r["recommended_actions"]]
    return "\n".join(out)


def build_graph():
    g = StateGraph(IntelligenceState)
    for name, fn in [("planner", planner), ("researcher", researcher), ("evidence_analyst", evidence_analyst),
                     ("decision_engine", decision_engine), ("synthesizer", synthesizer), ("next_iteration", bump_iteration)]:
        g.add_node(name, fn)
    g.add_edge(START, "planner")
    g.add_edge("planner", "researcher")
    g.add_edge("researcher", "evidence_analyst")
    g.add_edge("evidence_analyst", "decision_engine")
    g.add_conditional_edges("decision_engine", route_after_decision, {"researcher": "next_iteration", "synthesizer": "synthesizer"})
    g.add_edge("next_iteration", "researcher")
    g.add_edge("synthesizer", END)
    return g.compile()


graph = build_graph()
