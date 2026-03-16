import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
};

// Fix Turbopack root detection issue
// Next.js was detecting multiple lockfiles and selecting wrong root
export default nextConfig;
