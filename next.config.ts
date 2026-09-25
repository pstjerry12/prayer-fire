import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Baked into the client bundle so an open app can tell when a newer
    // build has been deployed (compared against /api/app-version).
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "",
  },
};

export default nextConfig;
