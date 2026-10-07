const backend = (process.env.CODESAGE_BACKEND_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
/** @type {import('next').NextConfig} */
const config = {
  turbopack: { root: import.meta.dirname },
  reactStrictMode: true,
  devIndicators: false,
  output: 'standalone',
  // Indexing is synchronous in the current backend and can exceed Next's 30s default.
  experimental: { proxyTimeout: 600_000, proxyClientMaxBodySize: '102mb' },
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${backend}/:path*` }];
  },
};
export default config;
