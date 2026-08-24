import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["firebase-admin"],
  output: 'standalone',
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
