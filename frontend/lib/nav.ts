import { Activity, Bookmark, Building2, History, Radio, Settings, TerminalSquare } from "lucide-react";

export const NAV = [
  { href: "/", label: "Terminal", icon: TerminalSquare, key: "1" },
  { href: "/signals", label: "Signals", icon: Radio, key: "2" },
  { href: "/history", label: "History", icon: History, key: "3" },
  { href: "/companies", label: "Companies", icon: Building2, key: "4" },
  { href: "/reports", label: "Reports", icon: Bookmark, key: "5" },
  { href: "/system", label: "System", icon: Activity, key: "6" },
  { href: "/settings", label: "Settings", icon: Settings, key: "7" },
] as const;

export const isActive = (path: string, href: string) =>
  href === "/" ? path === "/" || path.startsWith("/research") : path.startsWith(href);
