import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === 'production'
        ? z.string()
        : z.string().optional(),
    AUTH_URL: z.string().url(),
    AUTH_TRUST_HOST: z.string(),
    AUTH_GOOGLE_ID: z.string(),
    AUTH_GOOGLE_SECRET: z.string(),
    CRON_SECRET: z.string(),
    DATABASE_URL: z.string().url(),
    TMDB_API_KEY: z.string(),
    BUNNY_URL: z.string().url(),
    FRONTEND_URL: z.string(),
    HEADLESS: z.string(),
    FIRST_CLICK: z.string(),
    LONG_CLICK: z.string(),
    MID_CLICK: z.string(),
    SHORT_CLICK: z.string(),
    M3U8_WAIT_JOY: z.string(),
    M3U8_WAIT_EASY: z.string(),
    M3U8_WAIT_LINK: z.string(),
    M3U8_WAIT_FAST: z.string(),
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST,
    AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET,
    CRON_SECRET: process.env.CRON_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    TMDB_API_KEY: process.env.TMDB_API_KEY,
    BUNNY_URL: process.env.BUNNY_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    NODE_ENV: process.env.NODE_ENV,
    HEADLESS: process.env.HEADLESS,
    FIRST_CLICK: process.env.FIRST_CLICK,
    LONG_CLICK: process.env.LONG_CLICK,
    MID_CLICK: process.env.MID_CLICK,
    SHORT_CLICK: process.env.SHORT_CLICK,
    M3U8_WAIT_JOY: process.env.M3U8_WAIT_JOY,
    M3U8_WAIT_EASY: process.env.M3U8_WAIT_EASY,
    M3U8_WAIT_LINK: process.env.M3U8_WAIT_LINK,
    M3U8_WAIT_FAST: process.env.M3U8_WAIT_FAST,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
