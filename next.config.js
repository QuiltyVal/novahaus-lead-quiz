/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  experimental: {
    outputFileTracingIncludes: {
      '/admin/migrations': ['./db/migrations/**/*.sql'],
      '/admin/migrations/**': ['./db/migrations/**/*.sql'],
    },
  },
  images: {
    // Allow Next.js image optimization for local images
    unoptimized: false,
  },
}

module.exports = nextConfig
