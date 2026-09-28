import httpx
from fastapi import Header, HTTPException

from .config import settings

_http = httpx.AsyncClient(timeout=15)


async def current_user(authorization: str | None = Header(None)) -> dict:
    """Validate an InsForge access token by asking InsForge.
    ponytail: one network hop per request; verify the JWT locally with JWT_PUBLIC_KEY if latency matters."""
    bearer = (authorization or "").removeprefix("Bearer ").strip()
    if not bearer:
        raise HTTPException(401, "Missing token")
    r = await _http.get(f"{settings.insforge_base_url}/api/auth/sessions/current", headers={"Authorization": f"Bearer {bearer}"})
    body = r.json() if r.status_code == 200 else {}
    user = body.get("user") or body
    if not user.get("id"):
        raise HTTPException(401, "Invalid token")
    return user
