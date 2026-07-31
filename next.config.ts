import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Server-only — not NEXT_PUBLIC_ — since the browser never talks to the
    // backend directly anymore. /api/* is handled by real Route Handlers
    // (app/api/auth/*, app/api/backend/*), which always take precedence over
    // these rewrites.
    const apiBase = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:5000";

    return [
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
