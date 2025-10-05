import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow warnings during build, only fail on errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ensure TypeScript errors fail the build
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
