"""Graph runs end to end with every external call mocked; the Jev-driven loop must terminate."""
import asyncio

from app import graph as g


async def fake_structured(schema, _messages, role="fast"):
    return {
            g.Plan: g.Plan(entities=[g.Entity(name="Anthropic", domain="anthropic.com")],
                           tasks=[g.Task(topic="pricing", query="anthropic pricing", include_domains=["anthropic.com"], freshness=None)]),
            g.EvidenceSet: g.EvidenceSet(
                claims=[g.Claim(claim="Sonnet input is $3/M", source_id=0, entity="Anthropic", topic="pricing",
                                excerpt="$3 / MTok", published_at=None, reliability=0.9)],
                changes=[g.Change(title="Sonnet price cut", company="Anthropic", summary="cheaper", claim_ids=[0], published_at=None)],
                contradictions=[], gaps=[g.Task(topic="news", query="sonnet price news", include_domains=[], freshness=None)]),
            g.Report: g.Report(title="T", executive_summary="S", highlights=[], why_it_matters="W", recommended_actions=["A"],
                               key_changes=[g.KeyChange(change_index=0, headline="H", bullets=["b"], quote=None, quote_source=None)]),
        }[schema]


async def fake_search(query, *_):
    return [{"url": f"https://x.com/{query}", "title": query, "snippet": "s", "relevance": "high", "provider": "context"}]


async def fake_scrape(url, **_):
    return "page " + url


async def fake_jev(_state, questions):
    base = {"is_real": {"type": "noul", "noul": 0.9},
            "change_type": {"type": "choice", "choice": "pricing", "confidence": 0.8},
            "impact": {"type": "score", "score": 3.5, "legend": {str(i): "" for i in range(5)}},
            "evidence_quality": {"type": "score", "score": 3.0, "legend": {str(i): "" for i in range(5)}},
            "affected": {"type": "choice", "choice": "developers", "confidence": 0.7},
            "needs_more": {"type": "noul", "noul": 0.99}}  # always wants more: loop must still stop
    return {k: base[k] for k in questions}


def test_graph_terminates_and_reports(monkeypatch):
    monkeypatch.setattr(g.llm, "structured", fake_structured)
    monkeypatch.setattr(g.decisions, "engine", lambda: "jev")
    monkeypatch.setattr(g.tools, "search", fake_search)
    monkeypatch.setattr(g.tools, "scrape", fake_scrape)
    monkeypatch.setattr(g.tools, "jev", fake_jev)
    events = []

    async def emit(ev):
        events.append(ev)

    out = asyncio.run(g.graph.ainvoke({"user_request": "What changed at Anthropic?", "mode": "deep"},
                                      config={"configurable": {"emit": emit}, "recursion_limit": 40}))
    assert out["iteration"] == g.settings.max_iterations
    assert out["report"]["markdown"].startswith("# T")
    c = out["changes"][0]
    assert (c["impact_score"], c["confidence"], c["recommended_action"]) == (88, 90, "alert")
    assert [e["node"] for e in events if e["type"] == "node_start"].count("researcher") == g.settings.max_iterations + 1


def test_recommend():
    assert g.recommend(False, 99, 99) == "ignore"
    assert g.recommend(True, 50, 99) == "investigate"
    assert g.recommend(True, 90, 71) == "alert"
    assert g.recommend(True, 90, 50) == "monitor"
