import type { NextConfig } from 'next';
import path from 'node:path';
const api = process.env.INTERNAL_API_URL ?? 'http://localhost:3001';
const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  async rewrites() {
    return [
      { source: '/_health', destination: '/health' },
      { source: '/api/backend/:path*', destination: `${api}/api/:path*` },
    ];
  },
};
export default nextConfig;
