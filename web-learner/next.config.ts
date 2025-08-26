import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Exclude cherry-studio directory from build
  experimental: {
    externalDir: true,
  },
  // Add headers for SharedArrayBuffer support (needed for some Pyodide features)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
  // Configure webpack to exclude cherry-studio
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // For client-side, exclude cherry-studio
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }
    
    // Add ignore patterns for cherry-studio
    config.module.rules.push({
      test: /\/cherry-studio\//,
      use: 'null-loader',
    });
    
    return config;
  },
  // Configure TypeScript to ignore cherry-studio
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
};

export default nextConfig;
