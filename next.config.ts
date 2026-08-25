import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core"],
  outputFileTracingIncludes: {
    // Tell Vercel to include browsers.json whenever tracing serverless functions under app/ backend
    "/**/*": ["./node_modules/playwright-core/browsers.json"],
  },
};

export default nextConfig;