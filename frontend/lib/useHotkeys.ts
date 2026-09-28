"use client";

import { useEffect, useRef } from "react";

const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/** Keys like "mod+k", "/", "1", "j". Plain keys are ignored while typing in a field; "mod+" keys always fire. */
export function useHotkeys(map: Record<string, (e: KeyboardEvent) => void>) {
  const ref = useRef(map);
  useEffect(() => {
    ref.current = map;
  });
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Chrome fires key-less keydown events when a <datalist>/autofill suggestion is picked.
      if (typeof e.key !== "string") return;
      const mod = e.metaKey || e.ctrlKey;
      const key = (mod ? "mod+" : "") + e.key.toLowerCase();
      const fn = ref.current[key];
      if (!fn || (!mod && (typing(e.target) || e.altKey))) return;
      e.preventDefault();
      fn(e);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

export const openPalette = (query = "") => window.dispatchEvent(new CustomEvent("palette:open", { detail: query }));
