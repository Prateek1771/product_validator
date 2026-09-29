"""Playbooks: skill-template markdown, per-company build, and the graph attaching the deliverable."""
import asyncio
import types
import typing

import pytest
from pydantic import BaseModel

from app import graph as g
from app import playbooks as pb
from tests.test_graph import fake_jev, fake_scrape, fake_search, fake_structured


def sample(t, name="Acme"):
    """Minimal valid instance of any schema type: lists get two items so tables and counts are exercised."""
    origin, args = typing.get_origin(t), typing.get_args(t)
    if origin is typing.Literal:
        return args[0]
    if origin in (typing.Union, types.UnionType):
        return sample(next(a for a in args if a is not type(None)), name)
    if origin is list:
        return [sample(args[0], name) for _ in range(2)]
    if isinstance(t, type) and issubclass(t, BaseModel):
        return t(**{k: (name if k == "name" else sample(f.annotation, name)) for k, f in t.model_fields.items()})
    return {str: "x", int: 3, bool: True, float: 0.5}[t]


def deliverable(p, names=("Anthropic", "OpenAI")):
    if not p.company_schema:
        return p.post(sample(p.summary_schema).model_dump())
    companies = [sample(p.company_schema, n).model_dump() for n in names]
    summary = sample(p.summary_schema).model_dump()
    if p.id == "battlecard":
        summary.update(subject=names[0], competitor=names[1])
    return {"companies": companies, **summary}


HEADINGS = {
    "profile": ["At a Glance", "Positioning & Messaging", "Product & Features", "Customers & Social Proof",
                "Strengths & Weaknesses", "Competitive Implications", "Raw Data Sources", "Side-by-Side Comparison", "Positioning Map"],
    "pricing": ["Tiers", "Scores", "Paste test", "Dimension-by-dimension", "Prioritized fixes", "The one thing", "Cost scenarios"],
    "battlecard": ["TL;DR", "Feature Comparison", "Pricing", "Service & Support", "Who Should Choose", "Migration", "Objection handling"],
    "landscape": ["Market map", "Competitor matrix", "Strengths", "Threats", "Trends", "Emerging players", "Takeaways"],
    "pain": ["Pain points", "Sentiment", "Feature requests", "Who is affected", "Opportunity gaps"],
    "sizing": ["TAM", "SAM", "SOM", "Growth", "Scenarios", "Caveats"],
    "opportunity": ["Call", "Segments", "Gaps", "Competitors to watch", "Risks", "First steps"],
}


@pytest.mark.parametrize("pid", list(HEADINGS))
def test_markdown_follows_skill_template(pid):
    p = pb.PLAYBOOKS[pid]
    d = deliverable(p)
    md = p.to_markdown(d)
    for h in HEADINGS[pid]:
        assert h in md, h
    f = pb.files(p, d)
    assert len(f) == (2 if pid in ("profile", "pricing") else 1) and all(x["markdown"] for x in f)


def test_brief_has_no_deliverable_and_unknown_falls_back():
    assert pb.get("brief").company_schema is None
    assert pb.get("nope").id == "brief" and pb.get(None).id == "brief"


def test_company_context_splits_sources():
    ents = [{"name": "Anthropic", "domain": "anthropic.com"}, {"name": "OpenAI", "domain": "openai.com"}]
    srcs = [{"url": "https://anthropic.com/pricing", "title": "Pricing"}, {"url": "https://openai.com/api", "title": "API"},
            {"url": "https://news.example/ai", "title": "AI roundup"}]
    got, claims = pb.company_context(ents[0], ents, srcs, [{"entity": "OpenAI", "claim": "c"}])
    assert [s["url"] for s in got] == ["https://anthropic.com/pricing", "https://news.example/ai"]
    assert claims == [{"entity": "OpenAI", "claim": "c"}]  # no own claims -> all


def _run(monkeypatch, playbook):
    calls = []
    p = pb.get(playbook)

    async def structured(schema, messages, role="fast"):
        calls.append((schema, messages[0][1], messages[-1][1]))
        if schema is p.company_schema:
            return sample(schema, "Acme")
        if schema is p.summary_schema:
            return sample(schema)
        return await fake_structured(schema, messages, role)

    monkeypatch.setattr(g.llm, "structured", structured)
    monkeypatch.setattr(g.decisions, "engine", lambda: "jev")
    monkeypatch.setattr(g.tools, "search", fake_search)
    monkeypatch.setattr(g.tools, "scrape", fake_scrape)
    monkeypatch.setattr(g.tools, "jev", fake_jev)
    out = asyncio.run(g.graph.ainvoke({"user_request": "OpenAI pricing", "mode": "web", "playbook": playbook},
                                      config={"recursion_limit": 40}))
    return out, calls


def test_pricing_playbook_builds_per_company_then_summary(monkeypatch):
    out, calls = _run(monkeypatch, "pricing")
    assert "PLAYBOOK pricing teardown" in next(sys for s, sys, _ in calls if s is g.Plan)
    assert "at least 30 claims" in next(sys for s, sys, _ in calls if s is g.EvidenceSet)
    per_company = [c for c in calls if c[0] is pb.CompanyPricing]
    assert len(per_company) == len(out["entities"]) and [c for c in calls if c[0] is pb.PricingSummary]
    d = out["report"]["deliverable"]
    assert d["playbook"] == "pricing" and len(d["data"]["companies"]) == len(out["entities"])
    assert d["files"] and "# Pricing Teardown" in out["report"]["markdown"]


def test_brief_playbook_unchanged(monkeypatch):
    out, calls = _run(monkeypatch, "brief")
    assert "deliverable" not in out["report"]
    assert all(s not in (pb.CompanyPricing, pb.PricingSummary) for s, *_ in calls)


def test_pain_shares_are_computed_from_counts():
    d = pb._pain_post({"themes": [{"theme": "a", "mentions": 3}, {"theme": "b", "mentions": 1}],
                       "sentiment": {"positive": 1, "neutral": 1, "negative": 2}})
    assert [t["share_pct"] for t in d["themes"]] == [75.0, 25.0]
    assert d["sentiment_pct"] == {"positive": 25.0, "neutral": 25.0, "negative": 50.0}
    assert d["sentiment_basis"] == "mentions"
    agg = pb._pain_post({"themes": [{"theme": "a", "mentions": 3}], "sentiment": {"positive": 2740, "neutral": 70, "negative": 18}})
    assert agg["sentiment_basis"] == "ratings"


def test_sizing_shows_the_product_of_inputs_and_flags_mismatch():
    lvl = lambda stated: {"value_usd": stated, "method": "m", "inputs": [
        {"label": "households", "value": 1_000_000, "unit": "", "source_url": None},
        {"label": "spend", "value": 200, "unit": "USD", "source_url": None}]}
    d = pb._sizing_post({"tam": lvl(200_000_000), "sam": lvl(900_000_000), "som": {"value_usd": 5, "method": "m", "inputs": []}})
    assert d["tam"]["computed_usd"] == 200_000_000 and d["tam"]["check"] == "ok"
    assert d["sam"]["check"] == "mismatch" and d["som"]["computed_usd"] is None


def test_opportunity_ranks_segments_by_demand_over_competition():
    d = pb._opportunity_post({"segments": [{"segment": "crowded", "demand": 9, "competition": 9},
                                           {"segment": "open", "demand": 7, "competition": 2}]})
    assert [x["segment"] for x in d["segments"]] == ["open", "crowded"]


def test_market_playbook_is_one_call_and_report_has_methodology(monkeypatch):
    out, calls = _run(monkeypatch, "sizing")
    assert len([c for c in calls if c[0] is pb.MarketSizing]) == 1
    m = out["report"]["methodology"]
    assert m["sources_found"] == len(out["sources"]) and m["claims"] == len(out["evidence"])
    assert [c["label"] for c in m["coverage"]] == [c[0] for c in pb.get("sizing").coverage]
    assert "computed_usd" in out["report"]["deliverable"]["data"]["tam"]
