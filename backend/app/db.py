"""InsForge records API (PostgREST) with the admin API key. Server-only."""
import httpx

from .config import settings

_http = httpx.AsyncClient(
    base_url=f"{settings.insforge_base_url}/api/database/records",
    headers={"x-api-key": settings.insforge_api_key, "Prefer": "return=representation"},
    timeout=30,
)


async def insert(table: str, rows: list[dict] | dict, upsert_on: str | None = None) -> list[dict]:
    rows = rows if isinstance(rows, list) else [rows]
    if not rows:
        return []
    r = await _http.post(f"/{table}", json=rows, params={"on_conflict": upsert_on} if upsert_on else None,
                         headers={"Prefer": "return=representation,resolution=merge-duplicates"} if upsert_on else None)
    r.raise_for_status()
    return r.json()


async def update(table: str, id: str, patch: dict) -> None:
    r = await _http.patch(f"/{table}", params={"id": f"eq.{id}"}, json=patch)
    r.raise_for_status()


async def select(table: str, **filters: str) -> list[dict]:
    r = await _http.get(f"/{table}", params=filters)
    r.raise_for_status()
    return r.json()


async def delete(table: str, **filters: str) -> None:
    r = await _http.delete(f"/{table}", params=filters)
    r.raise_for_status()
