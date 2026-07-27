/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    // Allow Next.js image optimization for local images
    unoptimized: false,
  },
}

module.exports = nextConfig
