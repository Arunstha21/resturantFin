import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // Mobile performance optimizations
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-select",
      "lucide-react",
      "recharts",
    ],
  },

  // Compress responses
  compress: true,
}

export default nextConfig
