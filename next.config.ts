import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
