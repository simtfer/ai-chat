import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Streaming responses are easier to observe locally without gzip buffering.
  compress: false,
};

export default nextConfig;
