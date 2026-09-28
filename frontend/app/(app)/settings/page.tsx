import { LogOut } from "lucide-react";
import { Kbd, PageTitle, Panel } from "@/components/term";
import { currentUser } from "@/lib/insforge";
import { NAV } from "@/lib/nav";
import { signOut } from "@/app/login/actions";
import { SettingsView } from "./SettingsView";
import { ThemePicker } from "./ThemePicker";

export const metadata = { title: "Settings" };

const STACK = [
  ["PLAN · ANALYZE · SYNTH", "LLM gateway: your key → platform OpenAI"],
  ["ORCHESTRATION", "LangGraph"],
  ["WEB DATA", "Context.dev → Tavily → Firecrawl"],
  ["DECISIONS", "Jev via OpenRouter, or LLM decision agent"],
  ["DATA · AUTH", "InsForge"],
];

export default async function SettingsPage() {
  const user = await currentUser();
  return (
    <div className="mx-auto max-w-4xl space-y-3 p-3 md:p-4">
      <PageTitle title="Settings" />
      <SettingsView />
      <Panel title="Appearance" bodyClassName="p-3"><ThemePicker /></Panel>
      <div className="grid gap-3 md:grid-cols-2">
        <Panel title="Account" bodyClassName="p-3">
          <dl className="grid grid-cols-[110px_1fr] gap-y-2 font-mono text-[12px]">
            <dt className="text-faint">EMAIL</dt><dd className="truncate">{user?.email}</dd>
            <dt className="text-faint">NAME</dt><dd>{(user?.profile as { name?: string } | null)?.name ?? "—"}</dd>
            <dt className="text-faint">SINCE</dt><dd>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</dd>
          </dl>
          <form action={signOut} className="mt-4"><button className="btn"><LogOut className="size-3.5" /> Sign out</button></form>
        </Panel>
        <Panel title="Shortcuts" bodyClassName="p-3">
          <ul className="space-y-1.5 text-[13px]">
            <li className="flex justify-between"><span className="text-dim">Command palette</span><span className="flex gap-1"><Kbd>Ctrl</Kbd><Kbd>K</Kbd> <Kbd>/</Kbd></span></li>
            {NAV.map((n) => <li key={n.href} className="flex justify-between"><span className="text-dim">{n.label}</span><Kbd>{n.key}</Kbd></li>)}
            <li className="flex justify-between"><span className="text-dim">Move in lists</span><span className="flex gap-1"><Kbd>j</Kbd><Kbd>k</Kbd></span></li>
          </ul>
        </Panel>
      </div>
      <Panel title="Agent stack">
        <ul className="divide-y divide-line/60">
          {STACK.map(([k, v]) => <li key={k} className="flex justify-between gap-4 px-3 py-2.5"><span className="label">{k}</span><span className="font-mono text-[12px]">{v}</span></li>)}
        </ul>
      </Panel>
    </div>
  );
}
