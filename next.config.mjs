/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['bufferutil', 'utf-8-validate', 'ws'],
  experimental: {
    optimizePackageImports: ['recharts', 'date-fns', 'framer-motion'],
  },
}

export default nextConfig
