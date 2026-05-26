import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  productionBrowserSourceMaps: false,
  compress: true,
  experimental: {
    optimizePackageImports: ["@radix-ui/react-*", "lucide-react"],
  },
};

export default nextConfig;
