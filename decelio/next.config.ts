import type { NextConfig } from "next";
import { getSecurityHeaders } from "./lib/security-headers";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Toutes les routes : pages, assets, routes API.
        source: "/(.*)",
        headers: getSecurityHeaders(process.env.NODE_ENV === "production"),
      },
    ];
  },
};

export default nextConfig;
