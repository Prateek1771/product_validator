import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // UI screenshots are mostly small text: 75 blurs it, so allow 90 for them.
  images: { qualities: [75, 90] },
};

export default nextConfig;
