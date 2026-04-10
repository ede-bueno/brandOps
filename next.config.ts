import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir:
    (process.env.BRANDOPS_DIST_DIR?.trim() as string | undefined) ||
    undefined,
  output:
    (process.env.BRANDOPS_OUTPUT_MODE?.trim() as "standalone" | undefined) ||
    undefined,
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
