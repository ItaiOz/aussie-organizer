import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure Prisma's generated query engine binaries are bundled with serverless functions.
  outputFileTracingIncludes: {
    "/**/*": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
