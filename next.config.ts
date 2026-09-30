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
  allowedDevOrigins: [
    'localhost:3000',
    '127.0.0.1:3000',
    '*.run.app',
    '*.googleusercontent.com',
  ],
};

export default nextConfig;
