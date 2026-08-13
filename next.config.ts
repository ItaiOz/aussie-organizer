import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow phones/other devices on the LAN to use the dev server
  allowedDevOrigins: ["192.168.1.206", "192.168.1.*"],
};

export default nextConfig;
