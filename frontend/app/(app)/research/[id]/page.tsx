import { notFound } from "next/navigation";
import { ResearchView } from "@/components/research/ResearchView";
import { serverClient } from "@/lib/insforge";

export const metadata = { title: "Research" };

export default async function ResearchPage(props: PageProps<"/research/[id]">) {
  const { id } = await props.params;
  const db = (await serverClient()).database;
  const [{ data: run }, { data: report }] = await Promise.all([
    db.from("research_runs").select("id, query, mode, created_at").eq("id", id).maybeSingle(),
    db.from("reports").select("saved").eq("run_id", id).maybeSingle(),
  ]);
  if (!run) notFound();
  return <ResearchView id={id} query={run.query} mode={run.mode} createdAt={run.created_at} savedInitially={Boolean(report?.saved)} />;
}
