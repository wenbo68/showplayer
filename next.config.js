/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import './src/env.js';

/** @type {import("next").NextConfig} */
const config = {
  // allow next/image to show images from the following sources
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com', // 👈 Add this
      },
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },

  // puppeteer-extra has clone-deep, which is incompatible with webpack
  // so we exclude puppeteer from webpack bundling on server side
  webpack: (config, { isServer }) => {
    // We only want to apply this change on the server-side build
    if (isServer) {
      // '...config.externals' is important to preserve other externals
      config.externals = [
        ...config.externals,
        'puppeteer',
        'puppeteer-extra',
        'puppeteer-extra-plugin-stealth',
        'puppeteer-cluster',
      ];
    }

    // Important: return the modified config
    return config;
  },
};

export default config;
