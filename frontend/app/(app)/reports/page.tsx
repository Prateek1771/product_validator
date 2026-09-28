import { PageTitle, Panel } from "@/components/term";
import { serverClient } from "@/lib/insforge";
import { ReportsTable, type ReportRow } from "./ReportsTable";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const { data } = await (await serverClient()).database
    .from("reports").select("id, run_id, title, saved, created_at, summary").order("created_at", { ascending: false }).limit(200);
  const rows = (data ?? []) as ReportRow[];
  return (
    <div className="mx-auto max-w-[1400px] p-3 md:p-4">
      <PageTitle title="Reports" sub="executive briefs" />
      <Panel title="Briefs" count={rows.length}><ReportsTable rows={rows} /></Panel>
    </div>
  );
}
