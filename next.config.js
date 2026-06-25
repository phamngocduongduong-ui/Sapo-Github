/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gỡ bỏ output: "export" và basePath để chạy dynamic trên Vercel
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

module.exports = nextConfig;
