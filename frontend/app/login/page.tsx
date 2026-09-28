import type { Metadata } from "next";
import Link from "next/link";
import { DemoLog } from "@/components/DemoLog";
import { Brand } from "@/components/term";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to MKT·INTEL, the AI market intelligence agent that tracks pricing, model and product changes across the AI industry.",
  alternates: { canonical: "/login" },
};

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_1fr]">
      <section className="grid-bg relative hidden flex-col border-r border-line bg-panel p-10 lg:flex">
        <Link href="/" aria-label="MKT·INTEL home"><Brand /></Link>
        <div className="mt-auto max-w-xl">
          <p className="label"><span className="text-amber">●</span> agentic market intelligence</p>
          <h1 className="mt-3 text-4xl leading-[1.1] font-semibold tracking-tight">
            Track the AI industry.<br />Find what changed.<br /><span className="text-amber">Decide what to do.</span>
          </h1>
          <DemoLog className="mt-8" />
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 block lg:hidden" aria-label="MKT·INTEL home"><Brand /></Link>
          <LoginForm oauthError={error ? String(error) : undefined} />
        </div>
      </section>
    </main>
  );
}
