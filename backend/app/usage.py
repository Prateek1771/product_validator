"""In-process provider meters for /system and per-run usage.
ponytail: resets on restart and is per-replica; persist to InsForge if history across deploys matters."""
import time
from collections import Counter
from contextvars import ContextVar

STARTED = time.time()
CREDIT_COOLDOWN = 3600  # seconds to skip a provider after it reports no credits

totals: Counter = Counter()           # "context.search", "tavily.search.fail", "jev.cost_micro", ...
last_error: dict[str, str] = {}
credits_left: dict[str, int] = {}     # latest balance a provider reported inline
exhausted_until: dict[str, float] = {}

# Per-run counter + timeline emitter, set by main.execute for the duration of a run.
run_counter: ContextVar[Counter | None] = ContextVar("run_counter", default=None)
run_emit: ContextVar = ContextVar("run_emit", default=None)


def hit(key: str, n: int = 1):
    totals[key] += n
    if (c := run_counter.get()) is not None:
        c[key] += n


def fail(provider: str, op: str, err: Exception):
    hit(f"{provider}.{op}.fail")
    last_error[provider] = f"{type(err).__name__}: {err}"[:300]


def is_exhausted(provider: str) -> bool:
    return exhausted_until.get(provider, 0) > time.time()


def mark_exhausted(provider: str):
    exhausted_until[provider] = time.time() + CREDIT_COOLDOWN


async def notify(message: str, node: str = "researcher"):
    if emit := run_emit.get():
        await emit({"type": "log", "node": node, "level": "warn", "message": message})
