"""Key gateway: user-supplied (BYOK) keys first, platform keys as fallback.

Keys are Fernet-encrypted at rest in `user_keys`; the browser can never read them (RLS + revoked grants),
it only ever sees `hint` (last 4 chars)."""
import hashlib
import time
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx
from cryptography.fernet import Fernet, InvalidToken

from . import db
from .config import settings

LLM_PROVIDERS = ("openai", "anthropic", "google", "openrouter")
WEB_PROVIDERS = ("context", "tavily", "firecrawl")
PROVIDERS = LLM_PROVIDERS + WEB_PROVIDERS


@dataclass
class UserConfig:
    llm: dict | None = None                      # {provider, fast_model, strong_model}
    keys: dict[str, str] = field(default_factory=dict)

    def key(self, provider: str) -> str | None:
        return self.keys.get(provider)

    @property
    def has_llm_key(self) -> bool:
        return any(p in self.keys for p in LLM_PROVIDERS)


# Set by main.execute for the duration of a run.
current: ContextVar[UserConfig | None] = ContextVar("user_config", default=None)


def platform_key(provider: str) -> str | None:
    return {"openai": settings.openai_api_key, "anthropic": settings.anthropic_api_key, "google": settings.google_api_key,
            "openrouter": settings.openrouter_api_key, "context": settings.context_dev_api_key,
            "tavily": settings.tavily_api_key, "firecrawl": settings.firecrawl_api_key}[provider] or None


def candidates(provider: str) -> list[tuple[str, bool]]:
    """(key, is_byok) in try-order: the user's key, then the platform key."""
    cfg, out = current.get(), []
    if cfg and (k := cfg.key(provider)):
        out.append((k, True))
    if (k := platform_key(provider)) and all(k != o for o, _ in out):
        out.append((k, False))
    return out


def slot(provider: str, key: str) -> str:
    """Stable id for breaker/usage per key without keeping the key around."""
    return f"{provider}:{hashlib.sha256(key.encode()).hexdigest()[:8]}"


# ---------- encryption ----------
def _fernet() -> Fernet:
    if not settings.secrets_key:
        raise RuntimeError("SECRETS_KEY is not set; refusing to store user keys")
    return Fernet(settings.secrets_key.encode())


def encrypt(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt(token: str) -> str | None:
    try:
        return _fernet().decrypt(token.encode()).decode()
    except (InvalidToken, RuntimeError):
        return None  # rotated SECRETS_KEY: treat as not set


# ---------- storage ----------
async def load(user_id: str) -> UserConfig:
    rows = await db.select("user_keys", user_id=f"eq.{user_id}", select="provider,key_enc")
    llm = await db.select("user_llm", user_id=f"eq.{user_id}", select="provider,fast_model,strong_model")
    keys = {r["provider"]: k for r in rows if (k := decrypt(r["key_enc"]))}
    return UserConfig(llm=llm[0] if llm else None, keys=keys)


async def listing(user_id: str) -> list[dict]:
    return await db.select("user_keys", user_id=f"eq.{user_id}", select="provider,hint,verified,updated_at")


async def save_key(user_id: str, provider: str, key: str, verified: bool) -> dict:
    [row] = await db.insert("user_keys", {"user_id": user_id, "provider": provider, "key_enc": encrypt(key), "hint": key[-4:],
                                          "verified": verified, "updated_at": datetime.now(timezone.utc).isoformat()},
                            upsert_on="user_id,provider")
    return {k: row[k] for k in ("provider", "hint", "verified", "updated_at")}


async def delete_key(user_id: str, provider: str):
    await db.delete("user_keys", user_id=f"eq.{user_id}", provider=f"eq.{provider}")


async def save_llm(user_id: str, provider: str, fast: str, strong: str):
    await db.insert("user_llm", {"user_id": user_id, "provider": provider, "fast_model": fast, "strong_model": strong,
                                 "updated_at": datetime.now(timezone.utc).isoformat()}, upsert_on="user_id")


async def delete_llm(user_id: str):
    await db.delete("user_llm", user_id=f"eq.{user_id}")


# ---------- provider checks ----------
_http = httpx.AsyncClient(timeout=20)
MODEL_ENDPOINTS = {
    "openai": ("https://api.openai.com/v1/models", lambda k: {"Authorization": f"Bearer {k}"}, None),
    "anthropic": ("https://api.anthropic.com/v1/models?limit=1000", lambda k: {"x-api-key": k, "anthropic-version": "2023-06-01"}, None),
    "google": ("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", lambda k: {}, lambda k: {"key": k}),
    "openrouter": ("https://openrouter.ai/api/v1/models", lambda k: {"Authorization": f"Bearer {k}"}, None),
}
VALIDATE = {
    "openai": MODEL_ENDPOINTS["openai"],
    "anthropic": MODEL_ENDPOINTS["anthropic"],
    "google": MODEL_ENDPOINTS["google"],
    "openrouter": ("https://openrouter.ai/api/v1/key", lambda k: {"Authorization": f"Bearer {k}"}, None),
    "tavily": ("https://api.tavily.com/usage", lambda k: {"Authorization": f"Bearer {k}"}, None),
    "firecrawl": ("https://api.firecrawl.dev/v2/team/credit-usage", lambda k: {"Authorization": f"Bearer {k}"}, None),
}


async def validate(provider: str, key: str) -> bool | None:
    """True = accepted, False = rejected, None = provider has no free check (Context.dev)."""
    if provider not in VALIDATE:
        return None
    url, headers, params = VALIDATE[provider]
    try:
        r = await _http.get(url, headers=headers(key), params=params(key) if params else None)
    except httpx.HTTPError:
        return None
    return r.status_code == 200


_models_cache: dict[str, tuple[float, list[dict]]] = {}


def _parse_models(provider: str, body: dict) -> list[dict]:
    if provider == "google":
        return [{"id": m["name"].removeprefix("models/"), "name": m.get("displayName")}
                for m in body.get("models", []) if "generateContent" in m.get("supportedGenerationMethods", [])]
    if provider == "openai":  # chat-capable families only; embeddings/tts/images can't do structured chat
        skip = ("embedding", "tts", "whisper", "dall-e", "transcribe", "image", "moderation", "audio", "realtime", "search", "sora", "codex")
        return [{"id": m["id"], "name": None} for m in body.get("data", [])
                if m["id"].startswith(("gpt-", "o1", "o3", "o4", "chatgpt")) and not any(s in m["id"] for s in skip)]
    if provider == "openrouter":
        return [{"id": m["id"], "name": m.get("name"), "context": m.get("context_length"),
                 "structured": "structured_outputs" in (m.get("supported_parameters") or [])} for m in body.get("data", [])]
    return [{"id": m["id"], "name": m.get("display_name")} for m in body.get("data", [])]


async def list_models(provider: str, key: str) -> list[dict]:
    ck = slot(provider, key)
    if (hit := _models_cache.get(ck)) and time.time() - hit[0] < 600:
        return hit[1]
    url, headers, params = MODEL_ENDPOINTS[provider]
    r = await _http.get(url, headers=headers(key), params=params(key) if params else None)
    r.raise_for_status()
    models = sorted(_parse_models(provider, r.json()), key=lambda m: m["id"])
    _models_cache[ck] = (time.time(), models)
    return models
