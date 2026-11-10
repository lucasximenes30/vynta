// Applied to every response. No full CSP yet: the marketing pixels (Utmify/Facebook) load inline
// and third-party scripts; frame-ancestors alone already blocks clickjacking.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
]

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ['bufferutil', 'utf-8-validate', 'ws'],
  experimental: {
    optimizePackageImports: ['recharts', 'date-fns', 'framer-motion'],
    // Reuse visited dynamic screens for 30s: instant tab switches in the PWA.
    // Mutations via fetch('/api/…') invalidate it (see components/RouterCacheSync.tsx).
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
