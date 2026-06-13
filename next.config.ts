import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // These packages ship native/WASM assets that must load from node_modules at
  // runtime rather than being bundled by Turbopack/webpack.
  serverExternalPackages: [
    "@electric-sql/pglite",
    "@neondatabase/serverless",
    "ws",
  ],
};

export default nextConfig;
