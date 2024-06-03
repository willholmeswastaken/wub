/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
    images: {
        remotePatterns: [
          {
            protocol: 'https',
            hostname: 'flag.vercel.app',
          },
          {
            protocol: 'https',
            hostname: 'uaparser.js.org',
          },
          {
            protocol: 'https',
            hostname: 'cdnjs.cloudflare.com',
          },
          {
            protocol: 'https',
            hostname: 'app.dub.co',
          },
        ],
      },
};

export default config;
