import { PageTitle, Panel } from "@/components/term";
import { serverClient } from "@/lib/insforge";
import { Watchlist, type WatchRow } from "./Watchlist";

export const metadata = { title: "Companies" };

type Change = WatchRow["changes"][number] & { company: string | null };

export default async function CompaniesPage() {
  const db = (await serverClient()).database;
  const [{ data: companies }, { data: changes }] = await Promise.all([
    db.from("companies").select("id, name, domain").order("name"),
    db.from("changes").select("id, run_id, company, title, impact_score, recommended_action, created_at")
      .eq("is_real_change", true).order("created_at", { ascending: false }).limit(500),
  ]);
  const by = new Map<string, Change[]>();
  for (const c of (changes ?? []) as Change[]) {
    const k = (c.company ?? "").toLowerCase();
    by.set(k, [...(by.get(k) ?? []), c]);
  }
  const rows: WatchRow[] = ((companies ?? []) as { id: string; name: string; domain: string | null }[]).map((co) => {
    const list = by.get(co.name.toLowerCase()) ?? [];
    return { ...co, changes: list, n: list.length, top: Math.max(0, ...list.map((c) => c.impact_score ?? 0)), last: list[0]?.created_at ?? null };
  }).sort((a, b) => b.top - a.top || b.n - a.n);

  return (
    <div className="mx-auto max-w-[1400px] p-3 md:p-4">
      <PageTitle title="Companies" sub="Companies found in your research, with their biggest recent change" />
      <Panel title="Watchlist" count={rows.length}><Watchlist rows={rows} /></Panel>
    </div>
  );
}
