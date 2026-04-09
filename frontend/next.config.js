/** @type {import('next').NextConfig} */

// Increase EventEmitter max listeners to prevent warnings in dev
const { EventEmitter } = require('events');
EventEmitter.defaultMaxListeners = 20;

const nextConfig = {
  images: {
    // Whitelist every image domain used in the app
    remotePatterns: [
      { protocol: 'https', hostname: 'api.dicebear.com' },   // NFT avatar/shape images
      { protocol: 'https', hostname: 'picsum.photos'    },   // Seeded landscape photos
      { protocol: 'https', hostname: 'cloudflare-ipfs.com' },
      { protocol: 'https', hostname: 'ipfs.io'          },
      { protocol: 'https', hostname: 'models.readyplayer.me' },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
      'react-native':        false,
      'react-native-randombytes': false,
      '@react-native-community/netinfo': false,
      // Three.js uses these Node built-ins in some paths
      fs: false, path: false, crypto: false,
    };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

module.exports = nextConfig;