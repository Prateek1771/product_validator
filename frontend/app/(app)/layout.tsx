import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { Rail } from "@/components/shell/Rail";
import { Ticker, type TickerItem } from "@/components/shell/Ticker";
import { TopBar } from "@/components/shell/TopBar";
import { currentUser, serverClient } from "@/lib/insforge";

// Signed-in workspace: keep every authenticated route out of search results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const db = (await serverClient()).database;
  const [{ data: wire }, { data: recent }] = await Promise.all([
    db.from("changes").select("id, run_id, company, change_type, title, impact_score")
      .eq("is_real_change", true).order("created_at", { ascending: false }).limit(15),
    db.from("research_runs").select("id, query").order("created_at", { ascending: false }).limit(8),
  ]);
  return (
    <div className="min-h-screen">
      <TopBar email={user.email} />
      <Ticker items={(wire ?? []) as TickerItem[]} />
      <div className="flex">
        <Rail />
        <main className="min-w-0 flex-1 pb-16 md:pb-0">{children}</main>
      </div>
      <CommandPalette recent={(recent ?? []) as { id: string; query: string }[]} />
    </div>
  );
}
