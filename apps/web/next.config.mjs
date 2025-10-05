import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';

const workspaceEnv = resolve(process.cwd(), '../../.env');
loadEnv({ path: workspaceEnv, override: true });
loadEnv();

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['nodemailer'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.printful.com',
      },
      {
        protocol: 'https',
        hostname: '**.printify.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 's3.aleou.app',
      },
    ],
  },
};

export default nextConfig;