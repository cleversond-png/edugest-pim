import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: false,
  compress: true,
  rewrites: async () => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${apiUrl}/api/:path*`,
        },
      ],
    };
  },
  experimental: {
    optimizePackageImports: ["@radix-ui/react-*", "lucide-react"],
  },
};

export default nextConfig;
