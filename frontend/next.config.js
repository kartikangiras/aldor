/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        os: false,
        path: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        constants: false,
        child_process: false,
        dns: false,
        dgram: false,
        'bare-fs': false,
        'bare-os': false,
        'bare-tty': false,
        'bare-signals': false,
        'bare-stdio': false,
        'bare-events': false,
        'bare-stream': false,
        'bare-pipe': false,
        'bare-process': false,
      };
      // Prevent bundling Node.js native addons
      config.module.rules.push({
        test: /\.node$/,
        use: 'node-loader',
      });
    }
    return config;
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
