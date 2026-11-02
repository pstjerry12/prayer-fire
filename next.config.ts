import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // One small file per Bible book and translation (see scripts/split-bible.mjs). The folder name carries the
        // version, so these can be cached for a year without ever going stale.
        source: "/bible-data/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
  env: {
    // Baked into the client bundle so an open app can tell when a newer
    // build has been deployed (compared against /api/app-version).
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "",
  },
};

export default nextConfig;
