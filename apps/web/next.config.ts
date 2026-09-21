import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.resolve(process.cwd(), '../..'),
  async rewrites() {
    return [{ source: '/_health', destination: '/health' }];
  },
};

export default nextConfig;
