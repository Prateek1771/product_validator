"""LLM gateway: picks provider + model per role from the user's BYOK settings, else the platform OpenAI key.

role "fast"   -> planner, evidence analyst, LLM decision agent
role "strong" -> final brief"""
import logging
from dataclasses import dataclass

from langchain_openai import ChatOpenAI

from . import keys, usage
from .config import settings

log = logging.getLogger(__name__)
NAMES = {"openai": "OpenAI", "anthropic": "Anthropic", "google": "Gemini", "openrouter": "OpenRouter"}


@dataclass(frozen=True)
class Route:
    provider: str
    model: str
    key: str
    byok: bool

    def label(self) -> str:
        return f"{NAMES[self.provider]} {self.model}" + (" · your key" if self.byok else " · platform")


def platform_route(role: str) -> Route:
    model = settings.openai_strong_model if role == "strong" else settings.openai_llm_model
    return Route("openai", model, settings.openai_api_key, False)


def resolve(role: str = "fast") -> Route:
    cfg = keys.current.get()
    if cfg and cfg.llm:
        p = cfg.llm["provider"]
        user_key = cfg.key(p)
        key = user_key or keys.platform_key(p)
        if key:
            return Route(p, cfg.llm["strong_model" if role == "strong" else "fast_model"], key, bool(user_key))
    return platform_route(role)


def chat(r: Route):
    if r.provider == "anthropic":
        from langchain_anthropic import ChatAnthropic
        return ChatAnthropic(model=r.model, api_key=r.key, temperature=0.1, max_tokens=8192)
    if r.provider == "google":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(model=r.model, google_api_key=r.key, temperature=0.1)
    if r.provider == "openrouter":
        return ChatOpenAI(model=r.model, api_key=r.key, base_url="https://openrouter.ai/api/v1", temperature=0.1)
    return ChatOpenAI(model=r.model, api_key=r.key, temperature=0.1)


def _is_key_problem(e: Exception) -> bool:
    code = getattr(e, "status_code", None) or getattr(getattr(e, "response", None), "status_code", None)
    text = str(e).lower()
    return code in (401, 402, 403, 429) or any(s in text for s in ("api key", "api_key", "quota", "credit", "unauthorized", "permission"))


async def _invoke(r: Route, schema, messages):
    usage.hit(f"llm.{r.provider}.calls")
    if r.byok:
        usage.hit(f"llm.{r.provider}.byok")
    out = await chat(r).with_structured_output(schema, include_raw=True).ainvoke(messages)
    if tokens := (getattr(out["raw"], "usage_metadata", None) or {}).get("total_tokens"):
        usage.hit(f"llm.{r.provider}.tokens", tokens)
    if out.get("parsed") is None:
        raise out.get("parsing_error") or ValueError(f"{r.label()} returned no structured output")
    return out["parsed"]


CONCISE = ("Your previous answer was cut off at the output limit. Be concise: at most 8 items per list, one sentence per "
           "field, no repetition.")


def _is_length_limit(e: Exception) -> bool:
    return type(e).__name__ == "LengthFinishReasonError" or "length limit" in str(e).lower()


async def structured(schema, messages, role: str = "fast"):
    """Structured call on the resolved route. A user key that fails auth/quota falls back to the platform once."""
    r = resolve(role)
    try:
        try:
            return await _invoke(r, schema, messages)
        except Exception as e:
            if not _is_length_limit(e):
                raise
            # Big sources (long pricing pages) can make the model run past its output cap: retry once, tighter.
            log.warning("structured output hit the length limit on %s, retrying concisely", r.label())
            return await _invoke(r, schema, [("system", CONCISE), *messages])
    except Exception as e:
        usage.fail(f"llm.{r.provider}", "call", e)
        fallback = platform_route(role)
        if not (r.byok and _is_key_problem(e) and fallback.key):
            raise
        log.warning("user LLM key failed (%s), falling back to platform", e)
        await usage.notify(f"Your {NAMES[r.provider]} key failed ({type(e).__name__}), using {fallback.label()}", node="planner")
        return await _invoke(fallback, schema, messages)
