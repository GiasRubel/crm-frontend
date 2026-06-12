import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5000";

    return [
      {
        source: "/api/:path*",
        destination: `${apiBase}/api/:path*`,
      },
      {
        source: "/files/:path*",
        destination: `${apiBase}/files/:path*`,
      },
      {
        source: "/swagger/:path*",
        destination: `${apiBase}/swagger/:path*`,
      },
    ];
  },
};

export default nextConfig;
