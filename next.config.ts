import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async headers() {
    return [
      {
        source: '/silent-check',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' http://localhost:3000 http://localhost:3001 http://localhost:3002 http://localhost:3003 *.whisperrnote.space *.whisperr.io;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
