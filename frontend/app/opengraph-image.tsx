import { ImageResponse } from "next/og";

export const alt = "MKT·INTEL: AI market research agent for competitor profiles, pricing teardowns, battlecards and market trends";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Report types with example questions (no invented findings).
const WIRE = [
  ["#ffb000", "PROFILE", "Notion vs Coda vs Confluence"],
  ["#ffb000", "PRICING", "Shopify vs BigCommerce"],
  ["#ffb000", "TRENDS", "Home fitness, this year"],
];

export default function OpengraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#07090c", color: "#d7dee8", padding: 64, fontFamily: "monospace" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, background: "#ffb000", color: "#1a1200", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800 }}>M</div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 4 }}><span>MKT</span><span style={{ color: "#ffb000" }}>·</span><span>INTEL</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 56, fontSize: 64, fontWeight: 700, lineHeight: 1.1, fontFamily: "sans-serif" }}>
        <span>Research any market.</span>
        <span>Size up competitors.</span>
        <span style={{ color: "#ffb000" }}>Every claim sourced.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", border: "1px solid #273142", borderRadius: 8, background: "#0c1016" }}>
        {WIRE.map(([c, kind, q], i) => (
          <div key={kind} style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 20px", fontSize: 22, borderTop: i ? "1px solid #1b2330" : "none" }}>
            <span style={{ color: c, fontWeight: 800, width: 140 }}>{kind}</span>
            <span style={{ color: "#7b8797" }}>&gt;</span>
            <span style={{ flex: 1 }}>{q}</span>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
