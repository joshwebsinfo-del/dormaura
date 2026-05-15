import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // PWA can be added later via @ducanh2912/next-pwa (supports Next.js 15)
  // For now, manifest.json provides installability
};

export default nextConfig;
