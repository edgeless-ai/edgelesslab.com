import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  experimental: {
    optimizePackageImports: ["lucide-react"],
    turbo: {
      treeShaking: true,
    },
  },
  turbopack: {
    root: process.cwd(),
  },
  webpack: (config) => {
    // Tree-shake unused exports
    config.optimization = {
      ...config.optimization,
      usedExports: true,
      sideEffects: true,
    };
    return config;
  },
};

export default nextConfig;
