"""Key vault, LLM routing, and the Jev-or-LLM decision engine."""
import asyncio

import pytest
from cryptography.fernet import Fernet

from app import decisions, keys, llm, tools
from app.config import settings


@pytest.fixture(autouse=True)
def reset():
    yield
    keys.current.set(None)


def test_encrypt_roundtrip(monkeypatch):
    monkeypatch.setattr(settings, "secrets_key", Fernet.generate_key().decode())
    token = keys.encrypt("sk-secret-1234")
    assert token != "sk-secret-1234" and keys.decrypt(token) == "sk-secret-1234"
    monkeypatch.setattr(settings, "secrets_key", Fernet.generate_key().decode())
    assert keys.decrypt(token) is None  # rotated key: treated as unset, not a crash


def test_llm_resolve_precedence(monkeypatch):
    monkeypatch.setattr(settings, "openai_api_key", "plat-openai")
    assert llm.resolve("fast") == llm.Route("openai", settings.openai_llm_model, "plat-openai", False)
    assert llm.resolve("strong").model == settings.openai_strong_model

    choice = {"provider": "anthropic", "fast_model": "claude-fast", "strong_model": "claude-strong"}
    keys.current.set(keys.UserConfig(llm=choice, keys={}))  # chose Anthropic but no key and no platform key
    monkeypatch.setattr(keys, "platform_key", lambda p: "plat-openai" if p == "openai" else None)
    assert llm.resolve("fast").provider == "openai"

    keys.current.set(keys.UserConfig(llm=choice, keys={"anthropic": "mine"}))
    assert llm.resolve("fast") == llm.Route("anthropic", "claude-fast", "mine", True)
    assert llm.resolve("strong").model == "claude-strong"


def test_engine_routing(monkeypatch):
    monkeypatch.setattr(keys, "platform_key", lambda p: "plat-or" if p == "openrouter" else None)
    assert decisions.engine() == "jev"                                               # platform tier
    keys.current.set(keys.UserConfig(keys={"anthropic": "mine"}))
    assert decisions.engine() == "llm"                                               # BYOK without OpenRouter
    keys.current.set(keys.UserConfig(keys={"anthropic": "mine", "openrouter": "or"}))
    assert decisions.engine() == "jev"                                               # OpenRouter unlocks Jev


def test_llm_agent_emits_jev_shapes():
    q = {"real": tools.noul("real?", "yes", "no"),
         "kind": tools.choice("type?", {"pricing": "p", "model": "m"}),
         "impact": tools.score("impact?", ["low", "mid", "high"])}
    Schema = decisions._schema(q)
    raw = Schema(real__true=0.8, kind__0=3, kind__1=1, impact__0=0, impact__1=0.5, impact__2=0.5).model_dump()
    a = decisions.to_answers(q, raw)
    assert a["real"] == {"type": "noul", "noul": 0.8}
    assert a["kind"]["choice"] == "pricing" and a["kind"]["probabilities"] == {"pricing": 0.75, "model": 0.25}
    assert a["impact"]["score"] == 1.5 and tools.score_pct(a["impact"]) == 75
    assert set(a["impact"]) == {"type", "score", "confidence", "probabilities", "legend"}


def test_jev_error_falls_back_to_llm_agent(monkeypatch):
    async def boom(*_):
        raise RuntimeError("jev down")

    async def agent(state, questions):
        return {"real": {"type": "noul", "noul": 0.3}}

    monkeypatch.setattr(decisions, "engine", lambda: "jev")
    monkeypatch.setattr(tools, "jev", boom)
    monkeypatch.setattr(decisions, "llm_decide", agent)
    answers, used = asyncio.run(decisions.decide({}, {"real": tools.noul("r", "y", "n")}))
    assert used == "llm" and answers["real"]["noul"] == 0.3
