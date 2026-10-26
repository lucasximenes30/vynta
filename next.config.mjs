/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['bufferutil', 'utf-8-validate', 'ws'],
  experimental: {
    optimizePackageImports: ['recharts', 'date-fns', 'framer-motion'],
    // Reuse visited dynamic screens for 30s: instant tab switches in the PWA.
    // Mutations via fetch('/api/…') invalidate it (see components/RouterCacheSync.tsx).
    staleTimes: { dynamic: 30 },
  },
}

export default nextConfig
