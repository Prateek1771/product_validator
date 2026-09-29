import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
    <main id="main" className="grid min-h-[100dvh] lg:grid-cols-[1.15fr_1fr]">
      <section className="relative hidden flex-col overflow-hidden border-r border-line bg-panel p-10 lg:flex">
        <Link href="/"><Brand /></Link>
        <h1 className="mt-16 max-w-md text-4xl leading-[1.08] font-semibold tracking-tight">
          Find what changed in the AI market. <span className="text-amber">Decide what to do.</span>
        </h1>
        <div className="mt-auto -mr-32 -mb-16 translate-y-6 overflow-hidden rounded-md border border-line-2">
          <Image src="/screens/research.png" alt="Research view with a live agent log and a pricing teardown" width={1440} height={900} priority sizes="60vw" quality={90} className="h-auto w-full" />
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <Link href="/" className="mb-10 block lg:hidden"><Brand /></Link>
          <LoginForm oauthError={error ? String(error) : undefined} />
        </div>
      </section>
    </main>
  );
}
