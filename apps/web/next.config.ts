import type { NextConfig } from 'next';

/**
 * Next.js config for the Prunr diagnostic visualizer.
 * Transpiles workspace packages so App Router can import `@prunr-dev/types`.
 */
const nextConfig: NextConfig = {
  transpilePackages: ['@prunr-dev/types'],
};

export default nextConfig;
