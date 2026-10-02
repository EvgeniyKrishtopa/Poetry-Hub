import type { NextConfig } from "next";

// implements FR-1, NFR-1 of migrate-to-cache-components
const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  reactCompiler: true,
};

export default nextConfig;
