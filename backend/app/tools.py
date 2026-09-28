"""Web data (Context.dev, falling back to Tavily then Firecrawl) and Jev typed decisions via OpenRouter.

Every provider is tried with the user's own key first (BYOK), then the platform key (see keys.candidates)."""
import logging

import httpx
from context.dev import APIStatusError, AsyncContextDev
from firecrawl import AsyncFirecrawl
from tavily import AsyncTavilyClient

from . import keys, usage
from .config import settings

log = logging.getLogger(__name__)

# Social/aggregator noise dominates generic queries; official sources beat reposts.
NOISY_DOMAINS = ["linkedin.com", "facebook.com", "instagram.com", "threads.com", "x.com",
                 "twitter.com", "tiktok.com", "pinterest.com", "quora.com"]
NAMES = {"context": "Context.dev", "tavily": "Tavily", "firecrawl": "Firecrawl"}

_http = httpx.AsyncClient(timeout=60)
_clients: dict[tuple[str, str], object] = {}


def client(provider: str, key: str):
    """SDK clients cached per key. ponytail: unbounded; fine for a handful of BYOK users per replica."""
    if (provider, key) not in _clients:
        _clients[(provider, key)] = {
            "context": lambda: AsyncContextDev(api_key=key, timeout=90.0, max_retries=1),
            "tavily": lambda: AsyncTavilyClient(api_key=key),
            "firecrawl": lambda: AsyncFirecrawl(api_key=key),
        }[provider]()
    return _clients[(provider, key)]


class NoCredits(Exception):
    pass


def _is_credit_error(e: Exception) -> bool:
    """Out of credits or a dead key: retrying won't help, so trip the breaker."""
    return isinstance(e, APIStatusError) and (e.status_code in (401, 402) or "credit" in str(e).lower())


def _ctx_call(fn):
    async def run(c, key, byok, *args):
        try:
            resp = await fn(c, *args)
        except APIStatusError as e:
            if _is_credit_error(e):
                raise NoCredits(str(e)) from e
            raise
        if (m := getattr(resp, "key_metadata", None)) is not None:
            if not byok:
                usage.credits_left["context"] = m.credits_remaining
            if m.credits_remaining <= 0:
                usage.mark_exhausted(keys.slot("context", key))
        return resp
    return run


# ---------- per-provider search ----------
TAVILY_RANGE = {"last_24_hours": "day", "last_week": "week", "last_month": "month", "last_year": "year"}
FC_TBS = {"last_24_hours": "qdr:d", "last_week": "qdr:w", "last_month": "qdr:m", "last_year": "qdr:y"}


async def _search_context(c, key, byok, query, include_domains, freshness):
    kw = {"query": query, "num_results": 10}  # API minimum is 10
    kw["include_domains" if include_domains else "exclude_domains"] = include_domains or NOISY_DOMAINS
    if freshness:
        kw["freshness"] = freshness
    r = await _ctx_call(lambda c: c.web.search(**kw))(c, key, byok)
    return [{"url": x.url, "title": x.title, "snippet": x.description, "relevance": x.relevance} for x in r.results]


async def _search_tavily(c, key, byok, query, include_domains, freshness):
    r = await c.search(query, max_results=10, include_domains=include_domains or None,
                       exclude_domains=None if include_domains else NOISY_DOMAINS, time_range=TAVILY_RANGE.get(freshness))
    rel = lambda s: "high" if s >= 0.7 else "medium" if s >= 0.4 else "low"  # noqa: E731
    return [{"url": x["url"], "title": x["title"], "snippet": x["content"][:500], "relevance": rel(x["score"])} for x in r["results"]]


async def _search_firecrawl(c, key, byok, query, include_domains, freshness):
    ops = " OR ".join(f"site:{d}" for d in include_domains) if include_domains else " ".join(f"-site:{d}" for d in NOISY_DOMAINS[:5])
    r = await c.search(f"{query} {ops}", limit=10, **({"tbs": FC_TBS[freshness]} if freshness in FC_TBS else {}))
    return [{"url": x.url, "title": x.title or x.url, "snippet": x.description or "",
             "relevance": "high" if i < 3 else "medium" if i < 7 else "low"} for i, x in enumerate(r.web or [])]


# ---------- per-provider scrape ----------
async def _scrape_context(c, key, byok, url):
    p = await _ctx_call(lambda c: c.web.scrape(url=url, formats={"markdown": True}, shared_params={"main_content_only": True}))(c, key, byok)
    return p.markdown.data


async def _scrape_firecrawl(c, key, byok, url):
    return (await c.scrape(url, formats=["markdown"], only_main_content=True)).markdown


async def _scrape_tavily(c, key, byok, url):
    r = await c.extract([url], format="markdown")
    return r["results"][0]["raw_content"] if r["results"] else None


SEARCH = [("context", _search_context), ("tavily", _search_tavily), ("firecrawl", _search_firecrawl)]
SCRAPE = [("context", _scrape_context), ("firecrawl", _scrape_firecrawl), ("tavily", _scrape_tavily)]


def configured(provider: str) -> bool:
    """Platform key present (what /system reports)."""
    return keys.platform_key(provider) is not None


def platform_exhausted(provider: str) -> bool:
    k = keys.platform_key(provider)
    return bool(k) and usage.is_exhausted(keys.slot(provider, k))


async def _chain(op: str, chain, *args):
    """Walk providers in order and, per provider, the user's key then the platform key.
    Skips exhausted keys. Returns (provider, byok, result)."""
    errors, tried = [], False
    for name, fn in chain:
        for key, byok in keys.candidates(name):
            sl = keys.slot(name, key)
            if usage.is_exhausted(sl):
                continue
            try:
                usage.hit(f"{name}.{op}")
                if byok:
                    usage.hit(f"{name}.{op}.byok")
                out = await fn(client(name, key), key, byok, *args)
                if out:
                    if tried:
                        usage.hit(f"{name}.{op}.fallback")
                    return name, byok, out
            except NoCredits as e:
                usage.mark_exhausted(sl)
                usage.fail(name if not byok else f"{name}:byok", op, e)
                who = "your" if byok else "platform"
                await usage.notify(f"{NAMES[name]} {who} key unavailable (out of credits or invalid), switching")
            except Exception as e:  # any provider error: try the next key/provider
                usage.fail(name if not byok else f"{name}:byok", op, e)
                errors.append(f"{name}{'(byok)' if byok else ''}: {e}")
                log.warning("%s %s failed: %s", name, op, e)
            tried = True
    raise RuntimeError(f"All {op} providers failed: {'; '.join(errors) or 'none configured or all out of credits'}")


async def search(query: str, include_domains: list[str] | None = None, freshness: str | None = None) -> list[dict]:
    provider, byok, results = await _chain("search", SEARCH, query, include_domains, freshness)
    return [{**r, "provider": provider, "byok": byok} for r in results]


async def scrape(url: str, max_chars: int = 12000) -> str | None:
    try:
        _, _, md = await _chain("scrape", SCRAPE, url)
        return md[:max_chars]
    except RuntimeError as e:  # one dead page must not sink the run
        log.warning("scrape failed %s: %s", url, e)
        return None


async def jev(state: dict | str, questions: dict) -> dict:
    """POST /api/alpha/decisions with the user's OpenRouter key, else the platform's. Returns `answers`."""
    cands = keys.candidates("openrouter")
    if not cands:
        raise RuntimeError("No OpenRouter key for Jev")
    key, byok = cands[0]
    usage.hit("jev.decide")
    if byok:
        usage.hit("jev.decide.byok")
    try:
        r = await _http.post(
            "https://openrouter.ai/api/alpha/decisions",
            headers={"Authorization": f"Bearer {key}"},
            json={"model": settings.jev_model, "state": state, "questions": questions},
        )
        r.raise_for_status()
    except Exception as e:
        usage.fail("jev" if not byok else "jev:byok", "decide", e)
        raise
    body = r.json()
    if not byok:
        usage.hit("jev.cost_micro", round(body.get("usage", {}).get("cost", 0) * 1e6))  # micro-USD keeps Counter integral
    return body["answers"]


def noul(instructions: str, true: str, false: str) -> dict:
    return {"type": "noul", "instructions": instructions, "criteria": {"true": true, "false": false}}


def choice(instructions: str, criteria: dict[str, str]) -> dict:
    return {"type": "choice", "instructions": instructions, "criteria": criteria}


def score(instructions: str, levels: list[str]) -> dict:
    return {"type": "score", "instructions": instructions, "criteria": levels}


def score_pct(answer: dict) -> int:
    """Jev score is a probability-weighted level index; map to 0-100."""
    return round(answer["score"] / max(len(answer["legend"]) - 1, 1) * 100)
