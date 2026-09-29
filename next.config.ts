import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    // Disable Webpack filesystem cache in container environments to prevent file locking / ENOENT rename errors
    if (config.cache) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
