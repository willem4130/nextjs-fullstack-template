import type { NextConfig } from 'next'
import './src/env'

const nextConfig: NextConfig = {
  // Turbopack is enabled by default in Next.js 16+ with --turbopack flag
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
}

export default nextConfig
