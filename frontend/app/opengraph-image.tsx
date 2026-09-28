import { ImageResponse } from "next/og";

export const alt = "MKT·INTEL: AI market intelligence agent that tracks what changed across the AI industry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const WIRE = [
  ["#ff5a5f", "ANTHROPIC", "PRICING", "Opus pricing cut 40%", "87"],
  ["#ffb000", "OPENAI", "MODEL", "New model with 1M context", "64"],
  ["#20d38a", "GOOGLE", "DOCS", "Gemini rate-limit docs updated", "22"],
];

export default function OpengraphImage() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#07090c", color: "#d7dee8", padding: 64, fontFamily: "monospace" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 10, background: "#ffb000", color: "#1a1200", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 36, fontWeight: 800 }}>M</div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800, letterSpacing: 4 }}><span>MKT</span><span style={{ color: "#ffb000" }}>·</span><span>INTEL</span></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 56, fontSize: 64, fontWeight: 700, lineHeight: 1.1, fontFamily: "sans-serif" }}>
        <span>Track the AI industry.</span>
        <span>Find what changed.</span>
        <span style={{ color: "#ffb000" }}>Decide what to do.</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: "auto", border: "1px solid #273142", borderRadius: 8, background: "#0c1016" }}>
        {WIRE.map(([c, co, ty, t, s]) => (
          <div key={co} style={{ display: "flex", alignItems: "center", gap: 18, padding: "10px 20px", fontSize: 22, borderTop: co === "ANTHROPIC" ? "none" : "1px solid #1b2330" }}>
            <div style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
            <span style={{ fontWeight: 800, width: 170 }}>{co}</span>
            <span style={{ color: "#7b8797", width: 110 }}>{ty}</span>
            <span style={{ flex: 1 }}>{t}</span>
            <span style={{ color: c, fontWeight: 800 }}>{s}</span>
          </div>
        ))}
      </div>
    </div>,
    size,
  );
}
