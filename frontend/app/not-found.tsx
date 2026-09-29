import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/term";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center px-4">
      <Link href="/" className="w-fit"><Brand /></Link>
      <p className="mt-12 font-mono text-[13px] text-dim"><span className="text-amber">&gt;</span> 404 not found</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page does not exist.</h1>
      <p className="mt-2 text-[15px] text-dim">The link may be out of date, or the report was deleted.</p>
      <div className="mt-8 flex gap-2">
        <Link href="/" className="btn-amber h-10 px-4">Go home</Link>
        <Link href="/history" className="btn h-10 px-4">Run history</Link>
      </div>
    </main>
  );
}
