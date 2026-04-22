import type { NextConfig } from "next";

const configuredDistDir = (process.env.BRANDOPS_DIST_DIR || "").trim();

const nextConfig: NextConfig = {
  distDir: configuredDistDir || undefined,
  output:
    (process.env.BRANDOPS_OUTPUT_MODE?.trim() as "standalone" | undefined) ||
    undefined,
  allowedDevOrigins: ["127.0.0.1"],
  serverExternalPackages: ["googleapis"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rsv-ink-images.ink.rsvcloud.com",
      },
      {
        protocol: "https",
        hostname: "www.ohmydogloja.com",
      },
      {
        protocol: "https",
        hostname: "reserva.ink",
      },
    ],
  },
};

export default nextConfig;
