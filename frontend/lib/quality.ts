import type { Methodology, Source } from "./types";

// ponytail: heuristic source-quality score (not a ranking model). Official pages of a researched company score highest,
// then industry reports and news, then reviews, then forums and social posts.
const SOCIAL = /(^|\.)(reddit\.com|news\.ycombinator\.com|x\.com|twitter\.com|youtube\.com|medium\.com|quora\.com|facebook\.com)$/;
const BY_TYPE: Record<string, number> = { market: 80, news: 75, pricing: 70, docs: 70, changelog: 70, products: 70, blog: 65,
  competitors: 65, reviews: 60, forums: 50, models: 70, other: 55 };

export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
}

export function sourceQuality(s: Source, m?: Methodology | null): number {
  const host = hostOf(s.url);
  const official = (m?.entities ?? []).some((e) => e.domain && (host === e.domain.replace(/^www\./, "") || host.endsWith("." + e.domain.replace(/^www\./, ""))));
  if (official) return 95;
  if (SOCIAL.test(host)) return 50;
  return BY_TYPE[s.type] ?? 55;
}

export const qualityTier = (q: number) => (q >= 85 ? "high" : q >= 60 ? "medium" : "low");
