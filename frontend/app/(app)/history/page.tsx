import { PageTitle, Panel } from "@/components/term";
import { serverClient } from "@/lib/insforge";
import { HistoryTable, type HistoryRow } from "./HistoryTable";

export const metadata = { title: "History" };

export default async function HistoryPage() {
  const { data } = await (await serverClient()).database
    .from("research_runs").select("id, query, mode, status, created_at, duration:state->duration, changes(count), sources(count)")
    .order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as HistoryRow[];
  return (
    <div className="mx-auto max-w-[1400px] p-3 md:p-4">
      <PageTitle title="History" sub="every research run" />
      <Panel title="Runs" count={rows.length}><HistoryTable rows={rows} /></Panel>
    </div>
  );
}
