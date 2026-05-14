/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "playwright"],
  },
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
