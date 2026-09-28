"""Playbooks: schemas render to markdown, the planner gets the hint, and the graph attaches the deliverable."""
import asyncio

import pytest

from app import graph as g
from app import playbooks as pb
from tests.test_graph import fake_jev, fake_scrape, fake_search, fake_structured

SAMPLES = {
    "profile": pb.CompetitorProfiles(
        landscape="Two frontier labs.",
        companies=[pb.CompanyProfile(
            name="Anthropic", domain="anthropic.com", tagline="AI safety", positioning="enterprise-grade safety",
            target_customers=["enterprises"], pricing_tiers=[pb.Tier(name="Opus", price="$4 / MTok", unit="per million tokens", includes=["1M context"])],
            key_features=["tool use"], integrations=["AWS Bedrock"], notable_customers=["Acme"],
            review_themes=[pb.ReviewTheme(theme="great at code", sentiment="positive", quote="best coder", source_url=None)],
            strengths=["reasoning"], weaknesses=["rate limits"], recent_changes=["Opus 5.5 launch"])],
        positioning_map=pb.PositioningMap(x_axis="price", y_axis="focus", points=[pb.MapPoint(name="Anthropic", x=70, y=80)]),
        takeaways=["t"], opportunities=["o"]),
    "pricing": pb.PricingTeardown(
        companies=[pb.CompanyPricing(
            name="OpenAI", value_metric="tokens", free_tier="none",
            tiers=[pb.PriceTier(name="gpt-4.1", price="$2 / MTok", billing="usage-based", limits="tiered", notes=None)],
            changes=[pb.PriceChange(date="2026-09", what="cut input price", direction="down")],
            page_rubric=[pb.Verdict(dimension="Machine-readable pricing", verdict="pass", note="prices in HTML")])],
        comparison=[pb.ComparisonRow(dimension="Input $/MTok", values=["$2"])], insights=["i"], recommendation="r"),
    "battlecard": pb.Battlecard(
        subject="Anthropic", competitor="OpenAI", tldr="Close race.", subject_wins=["safety"], competitor_wins=["ecosystem"],
        features=[pb.FeatureRow(feature="Context", subject="1M", competitor="1M")], pricing_notes="similar",
        objections=[pb.Objection(objection="Pricier?", response="Cheaper since the cut.")], landmines=["Ask about rate limits"],
        pick_subject_if=["you need long context"], pick_competitor_if=["you need plugins"], migration="Swap SDK",
        proof_points=[pb.Proof(claim="40% cut", source_url="https://anthropic.com/pricing")]),
}


@pytest.mark.parametrize("pid", ["profile", "pricing", "battlecard"])
def test_markdown_renders(pid):
    md = pb.PLAYBOOKS[pid].to_markdown(SAMPLES[pid].model_dump())
    assert md.startswith("## ") and len(md) > 100


def test_brief_has_no_deliverable_and_unknown_falls_back():
    assert pb.get("brief").schema is None
    assert pb.get("nope").id == "brief" and pb.get(None).id == "brief"


def _run(monkeypatch, playbook):
    seen_prompts = []

    async def structured(schema, messages, role="fast"):
        seen_prompts.append((schema, messages[0][1]))
        if schema is pb.PricingTeardown:
            return SAMPLES["pricing"]
        return await fake_structured(schema, messages, role)

    monkeypatch.setattr(g.llm, "structured", structured)
    monkeypatch.setattr(g.decisions, "engine", lambda: "jev")
    monkeypatch.setattr(g.tools, "search", fake_search)
    monkeypatch.setattr(g.tools, "scrape", fake_scrape)
    monkeypatch.setattr(g.tools, "jev", fake_jev)
    out = asyncio.run(g.graph.ainvoke({"user_request": "OpenAI pricing", "mode": "web", "playbook": playbook},
                                      config={"recursion_limit": 40}))
    return out, seen_prompts


def test_pricing_playbook_attaches_deliverable(monkeypatch):
    out, prompts = _run(monkeypatch, "pricing")
    planner_prompt = next(p for s, p in prompts if s is g.Plan)
    assert "PLAYBOOK pricing teardown" in planner_prompt
    d = out["report"]["deliverable"]
    assert d["playbook"] == "pricing" and d["data"]["companies"][0]["name"] == "OpenAI"
    assert "## Pricing teardown" in out["report"]["markdown"]


def test_brief_playbook_unchanged(monkeypatch):
    out, prompts = _run(monkeypatch, "brief")
    assert "deliverable" not in out["report"]
    assert all(s is not pb.PricingTeardown for s, _ in prompts)
