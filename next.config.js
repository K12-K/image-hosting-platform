/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  swcMinify: false,
  experimental: {
    serverComponentsExternalPackages: ['@vercel/blob'],
  },
};

module.exports = nextConfig;
