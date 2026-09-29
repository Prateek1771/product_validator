"use client";

import { useEffect } from "react";

/** Opens the print dialog once fonts are ready, so the PDF never falls back to system fonts. */
export function AutoPrint() {
  useEffect(() => { document.fonts.ready.then(() => setTimeout(() => print(), 300)); }, []);
  return null;
}
