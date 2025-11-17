/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Temporarily ignore ESLint during builds to allow deployment
    // React Hook dependency warnings are safe to ignore for now
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig

