import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // AdMob's app-ads.txt: always plain text, and re-checked often so an edit is picked up quickly.
        source: "/app-ads.txt",
        headers: [
          { key: "Content-Type", value: "text/plain; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=300, s-maxage=300" },
        ],
      },
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
