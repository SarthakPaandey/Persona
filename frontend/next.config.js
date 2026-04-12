/** @type {import('next').NextConfig} */
// Where Next.js proxies /api/* and /health in dev and prod (FastAPI). Override with BACKEND_URL on Vercel.
const backendUrl =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

const nextConfig = {
  output: 'standalone',
  env: {
    // Leave empty to use same-origin + rewrites (recommended). Set only to force direct API URL in the browser.
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? '',
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
    ];
  },
};

module.exports = nextConfig;
