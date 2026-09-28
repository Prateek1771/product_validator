"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { NAV, isActive } from "@/lib/nav";
import { useHotkeys } from "@/lib/useHotkeys";

export function Rail() {
  const path = usePathname();
  const router = useRouter();
  useHotkeys(Object.fromEntries(NAV.map((n) => [n.key, () => router.push(n.href)])));

  return (
    <>
      <nav aria-label="Main" className="sticky top-0 hidden h-[calc(100vh-76px)] w-14 shrink-0 flex-col items-center gap-1 border-r border-line bg-panel py-3 md:flex" data-print-hide>
        {NAV.map(({ href, label, icon: Icon, key }) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} aria-label={label} aria-current={on ? "page" : undefined}
                  className={`group relative grid size-10 place-items-center rounded transition ${on ? "bg-amber-soft text-amber" : "text-dim hover:bg-hover hover:text-fg"}`}>
              {on && <span className="absolute top-2 bottom-2 -left-2 w-0.5 rounded-full bg-amber" />}
              <Icon className="size-[18px]" />
              <span className="pointer-events-none absolute left-12 z-30 hidden items-center gap-2 whitespace-nowrap rounded border border-line-2 bg-panel-2 px-2 py-1 font-mono text-[11px] text-fg shadow-lg group-hover:flex group-focus-visible:flex">
                {label} <span className="kbd">{key}</span>
              </span>
            </Link>
          );
        })}
      </nav>
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-panel/95 py-1.5 backdrop-blur md:hidden" data-print-hide>
        {NAV.slice(0, 6).map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} aria-label={label} className={`rounded p-2.5 ${isActive(path, href) ? "text-amber" : "text-dim"}`}>
            <Icon className="size-5" />
          </Link>
        ))}
      </nav>
    </>
  );
}
