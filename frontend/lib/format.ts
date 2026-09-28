export function domain(url: string | null | undefined) {
  try {
    return new URL(url ?? "").hostname.replace(/^www\./, "");
  } catch {
    return url ?? "";
  }
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
export function timeAgo(iso: string) {
  const s = (new Date(iso).getTime() - Date.now()) / 1000;
  for (const [unit, secs] of [["day", 86400], ["hour", 3600], ["minute", 60]] as const) {
    if (Math.abs(s) >= secs) return rtf.format(Math.round(s / secs), unit);
  }
  return "just now";
}

export function impactLevel(score?: number | null) {
  if (score == null) return { label: "Unscored", tone: "neutral" } as const;
  if (score > 70) return { label: "High impact", tone: "danger" } as const;
  if (score >= 30) return { label: "Medium impact", tone: "warn" } as const;
  return { label: "Low impact", tone: "success" } as const;
}

export const TONES = {
  danger: "bg-danger-soft text-danger",
  warn: "bg-warn-soft text-warn",
  success: "bg-success-soft text-success",
  accent: "bg-accent-soft text-accent",
  violet: "bg-violet-soft text-violet",
  neutral: "bg-surface-2 text-muted",
} as const;

export const ACTION_TONE = { alert: "danger", investigate: "violet", monitor: "accent", ignore: "neutral" } as const;
