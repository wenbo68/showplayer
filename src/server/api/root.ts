import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';
import { mediaRouter } from './routers/media';
import { cronRouter } from './routers/cron';
import { userRouter } from './routers/user';
import { stripeRouter } from './routers/stripe';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  cron: cronRouter,
  media: mediaRouter,
  stripe: stripeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
