import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['@sqlite.org/sqlite-wasm', 'sql.js'],
};

export default nextConfig;
