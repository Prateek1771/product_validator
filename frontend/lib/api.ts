import type { KeyProvider, LlmProvider, Mode, ModelInfo, RunEvent, SystemStatus, UserSettings } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function accessToken() {
  return document.cookie.match(/(?:^|; )insforge_access_token=([^;]*)/)?.[1] ?? "";
}

/** Calls the FastAPI backend with the InsForge access token; refreshes once on 401. */
async function authed(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${decodeURIComponent(accessToken())}` },
  });
  if (res.status === 401 && retry) {
    await fetch("/api/auth/refresh", { method: "POST" });
    return authed(path, init, false);
  }
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.detail ?? `Request failed (${res.status})`);
  return res;
}

export async function startResearch(query: string, mode: Mode): Promise<string> {
  const res = await authed("/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, mode }),
  });
  return (await res.json()).id;
}

export async function getSystem(): Promise<SystemStatus> {
  return (await authed("/system")).json();
}

const json = (method: string, body?: unknown): RequestInit =>
  ({ method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });

export const getSettings = async (): Promise<UserSettings> => (await authed("/settings")).json();
export const saveKey = async (p: KeyProvider, key: string): Promise<UserSettings> => (await authed(`/settings/keys/${p}`, json("PUT", { key }))).json();
export const deleteKey = async (p: KeyProvider): Promise<UserSettings> => (await authed(`/settings/keys/${p}`, json("DELETE"))).json();
export const listModels = async (p: LlmProvider): Promise<ModelInfo[]> => (await (await authed(`/settings/models/${p}`)).json()).models;
export const saveLlm = async (provider: LlmProvider, fast_model: string, strong_model: string): Promise<UserSettings> =>
  (await authed("/settings/llm", json("PUT", { provider, fast_model, strong_model }))).json();
export const resetLlm = async (): Promise<UserSettings> => (await authed("/settings/llm", json("DELETE"))).json();

/** SSE over fetch (EventSource can't send Authorization headers). Replays past events, then follows live. */
export async function streamEvents(id: string, onEvent: (e: RunEvent) => void, signal: AbortSignal) {
  const res = await authed(`/research/${id}/events`, { signal });
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buf += value.replaceAll("\r\n", "\n");
    let i;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const data = buf.slice(0, i).split("\n").filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
      buf = buf.slice(i + 2);
      if (data) onEvent(JSON.parse(data));
    }
  }
}
