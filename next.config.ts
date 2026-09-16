import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.GITHUB_ACTIONS ? "/nexusdesk-enterprise-support" : "",
  assetPrefix: process.env.GITHUB_ACTIONS ? "/nexusdesk-enterprise-support/" : "",
  images: { unoptimized: true },
  trailingSlash: true,
};

export default nextConfig;
