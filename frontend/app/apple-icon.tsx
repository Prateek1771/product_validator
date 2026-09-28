import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#07090c" }}>
      <div style={{ width: 132, height: 132, display: "flex", alignItems: "center", justifyContent: "center", background: "#ffb000", borderRadius: 28, color: "#1a1200", fontSize: 96, fontWeight: 800, fontFamily: "monospace" }}>M</div>
    </div>,
    size,
  );
}
