"""Provider chain: user key before platform key, credit breaker per key, provider fallback."""
import asyncio

import pytest

from app import keys, tools, usage


@pytest.fixture(autouse=True)
def clean(monkeypatch):
    usage.exhausted_until.clear()
    monkeypatch.setattr(tools, "client", lambda p, k: (p, k))
    monkeypatch.setattr(keys, "platform_key", lambda p: f"plat-{p}")
    yield
    usage.exhausted_until.clear()
    keys.current.set(None)


def test_credit_exhaustion_falls_back_and_breaks(monkeypatch):
    calls = []

    async def ctx(c, *_):
        calls.append(c)
        raise tools.NoCredits("402 no credits")

    async def tav(c, *_):
        calls.append(c)
        return [{"url": "https://a.com", "title": "A", "snippet": "", "relevance": "high"}]

    monkeypatch.setattr(tools, "SEARCH", [("context", ctx), ("tavily", tav)])
    first = asyncio.run(tools.search("q"))
    second = asyncio.run(tools.search("q"))
    assert first[0]["provider"] == second[0]["provider"] == "tavily"
    assert calls == [("context", "plat-context"), ("tavily", "plat-tavily"), ("tavily", "plat-tavily")]  # breaker skips context
    assert tools.platform_exhausted("context")


def test_user_key_first_then_platform_key_same_provider(monkeypatch):
    calls = []

    async def ctx(c, key, byok, *_):
        calls.append((key, byok))
        if byok:
            raise tools.NoCredits("user key out of credits")
        return [{"url": "https://b.com", "title": "B", "snippet": "", "relevance": "high"}]

    monkeypatch.setattr(tools, "SEARCH", [("context", ctx)])
    keys.current.set(keys.UserConfig(keys={"context": "mine"}))
    out = asyncio.run(tools.search("q"))
    assert calls == [("mine", True), ("plat-context", False)]
    assert out[0]["byok"] is False
    assert not tools.platform_exhausted("context")  # only the user's key is benched
