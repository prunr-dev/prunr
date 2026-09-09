import type { NextConfig } from 'next';

/**
 * Next.js config for the savemytokens diagnostic visualizer.
 * Transpiles workspace packages so App Router can import `@savemytokens/types`.
 */
const nextConfig: NextConfig = {
  transpilePackages: ['@savemytokens/types'],
};

export default nextConfig;
