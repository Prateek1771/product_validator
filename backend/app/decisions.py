"""Typed decisions (noul / choice / score) from Jev, or from an LLM decision agent with the same output shape.

Jev runs when an OpenRouter key applies: the user's own, or the platform's for users who brought no LLM key.
Users who bring only a non-OpenRouter LLM key get the LLM agent on their key, so nobody is locked behind Jev."""
from pydantic import Field, create_model

from . import keys, llm, tools, usage

AGENT_PROMPT = (
    "You are a calibrated decision engine that replaces a typed-decision model. For every field, return a probability "
    "between 0 and 1. Judge only from the provided state and evidence; if the evidence is thin, contradictory or "
    "unofficial, stay conservative and spread probability instead of guessing. Probabilities for one question's options "
    "should sum to 1."
)


def engine() -> str:
    cfg = keys.current.get()
    if cfg and cfg.key("openrouter"):
        return "jev"
    if cfg and cfg.has_llm_key:
        return "llm"
    return "jev" if keys.platform_key("openrouter") else "llm"


def _options(q: dict) -> list[str]:
    return list(q["criteria"]) if q["type"] == "choice" else [str(i) for i in range(len(q["criteria"]))]


def _schema(questions: dict):
    fields = {}
    for qk, q in questions.items():
        if q["type"] == "noul":
            c = q["criteria"]
            fields[f"{qk}__true"] = (float, Field(description=f"{q['instructions']} P(yes). yes = {c['true']}; no = {c['false']}"))
        else:
            labels = list(q["criteria"].items()) if q["type"] == "choice" else [(str(i), lvl) for i, lvl in enumerate(q["criteria"])]
            for i, (opt, desc) in enumerate(labels):
                fields[f"{qk}__{i}"] = (float, Field(description=f"{q['instructions']} P({opt}: {desc})"))
    return create_model("TypedDecisions", **fields)


def _normalise(ps: list[float]) -> list[float]:
    ps = [max(0.0, float(p)) for p in ps]  # no upper clamp: models sometimes answer in percent (80/20)
    total = sum(ps)
    return [p / total for p in ps] if total > 0 else [1 / len(ps)] * len(ps)


def to_answers(questions: dict, raw: dict) -> dict:
    """Convert flat per-option probabilities into Jev's exact answer shapes."""
    out = {}
    for qk, q in questions.items():
        if q["type"] == "noul":
            p = float(raw[f"{qk}__true"])
            out[qk] = {"type": "noul", "noul": round(max(0.0, min(1.0, p / 100 if p > 1 else p)), 4)}  # percent-tolerant
            continue
        opts = _options(q)
        ps = _normalise([raw[f"{qk}__{i}"] for i in range(len(opts))])
        probs = {o: round(p, 4) for o, p in zip(opts, ps)}
        if q["type"] == "choice":
            best = max(probs, key=probs.get)
            out[qk] = {"type": "choice", "choice": best, "confidence": round(max(ps), 4), "probabilities": probs}
        else:
            out[qk] = {"type": "score", "score": round(sum(i * p for i, p in enumerate(ps)), 4), "confidence": round(max(ps), 4),
                       "probabilities": probs, "legend": {str(i): lvl for i, lvl in enumerate(q["criteria"])}}
    return out


async def llm_decide(state, questions: dict) -> dict:
    usage.hit("decide.llm")
    parsed = await llm.structured(_schema(questions), [("system", AGENT_PROMPT), ("user", f"State:\n{state}")], role="fast")
    return to_answers(questions, parsed.model_dump())


async def decide(state, questions: dict) -> tuple[dict, str]:
    """Returns (answers, engine_used)."""
    if engine() == "jev":
        try:
            answers = await tools.jev(state, questions)
            usage.hit("decide.jev")
            return answers, "jev"
        except Exception as e:
            await usage.notify(f"Jev unavailable ({type(e).__name__}), using the LLM decision agent", node="decision_engine")
    return await llm_decide(state, questions), "llm"
