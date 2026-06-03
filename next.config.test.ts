import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  output: "standalone",
  trailingSlash: true,
  images: { unoptimized: true },
  typescript: { ignoreBuildErrors: true },
  turbopack: { root: process.cwd() },
};
export default nextConfig;
