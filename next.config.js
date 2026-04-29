/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Gỡ bỏ output: "export" và basePath để chạy dynamic trên Vercel
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
