/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js']
  },
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.NODE_ENV,
  },
  
  // Rewrites for API routes in development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:3001/api/:path*',
        },
      ]
    }
    return []
  }
}

module.exports = nextConfig