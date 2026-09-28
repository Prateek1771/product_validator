import { SignalsTable, type SignalRow } from "@/components/SignalsTable";
import { PageTitle, Panel } from "@/components/term";
import { serverClient } from "@/lib/insforge";

export default async function SignalsPage() {
  const { data } = await (await serverClient()).database
    .from("changes").select("id, run_id, company, change_type, title, summary, impact_score, confidence, recommended_action, created_at")
    .eq("is_real_change", true).order("created_at", { ascending: false }).limit(500);
  const rows = (data ?? []) as SignalRow[];
  return (
    <div className="mx-auto max-w-[1400px] p-3 md:p-4">
      <PageTitle title="Signals" sub="verified changes · ranked by jev impact" />
      <Panel title="All signals" count={rows.length}><SignalsTable rows={rows} filters /></Panel>
    </div>
  );
}
