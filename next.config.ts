import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Keeps screenshots clean; errors still show in the console and the overlay.
  devIndicators: false,
  experimental: {
    // Student documents go up to 10 Mo; leave room for the multipart overhead.
    serverActions: { bodySizeLimit: "11mb" },
    // proxy.ts runs on those routes and buffers request bodies (10 MB by default).
    proxyClientMaxBodySize: "11mb",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
