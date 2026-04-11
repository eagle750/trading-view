import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      /** Large strategy PDFs; also helps some upload paths in dev */
      bodySizeLimit: "32mb",
    },
  },
};

export default nextConfig;
