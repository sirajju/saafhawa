import type { NextConfig } from "next";
import { SECURITY_HEADERS_LIST } from "./src/lib/security";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [...SECURITY_HEADERS_LIST],
      },
    ];
  },
};

export default nextConfig;
