import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  rewrites: async () => ({
    afterFiles: [
      {
        source: "/api/:path*",
        destination: "http://localhost:3001/api/:path*",
      },
    ],
  }),
};

export default nextConfig;
