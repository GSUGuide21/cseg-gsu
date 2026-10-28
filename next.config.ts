import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {

  },
  images: {
    // PIN event images
    remotePatterns: [{ protocol: "https", hostname: "se-images.campuslabs.com" }],
  },
};

export default nextConfig;
