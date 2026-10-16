import type { NextConfig } from "next";

import { IMAGE_QUALITY } from "./src/shared/config/constants";
import { buildSupabaseImagePatterns } from "./src/shared/config/supabase-image-patterns";

// implements NFR-1 of migrate-to-cache-components
const nextConfig: NextConfig = {
  reactStrictMode: true,
  cacheComponents: true,
  reactCompiler: true,
  experimental: {
    serverActions: {
      // An author photo (at most 5 MiB) travels inside a Server Action's body, plus multipart overhead.
      // The default 1 MB would reject it before the action's own checks run.
      bodySizeLimit: "6mb",
    },
  },
  images: {
    // Read at build time: a build without the URL (CI) allows no remote host, and photos don't render.
    remotePatterns: buildSupabaseImagePatterns(process.env.NEXT_PUBLIC_SUPABASE_URL),
    // AVIF first: smaller than WebP at the same quality; browsers without it get WebP.
    formats: ["image/avif", "image/webp"],
    qualities: [IMAGE_QUALITY],
  },
};

export default nextConfig;
