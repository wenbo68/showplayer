// ~/scripts/runDailyCron.ts

import 'dotenv/config'; // Make sure to load environment variables
import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';

/**
 * This is the entry point for our daily cron job.
 * It calls the single "master" tRPC procedure that runs all jobs in sequence.
 */
async function main() {
  console.log(
    `[${new Date().toISOString()}] --- STARTING DAILY CRON SEQUENCE ---`
  );

  // 1. Create a tRPC context.
  const ctx = await createTRPCContext({ headers: new Headers() });

  // 2. Create a tRPC server-side caller.
  // To call a protectedProcedure, we provide a mock "system admin" session.
  const caller = appRouter.createCaller({
    ...ctx,
    session: {
      user: {
        id: 'system-cron', // A system identifier
        name: 'Cron Job',
        email: 'cron@system.local',
        role: 'admin',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  try {
    // 3. Call the single master procedure with a default limit.
    await caller.cron.runCron({ tmdbListLimit: 50 });

    console.log(
      `[${new Date().toISOString()}] --- DAILY CRON SEQUENCE COMPLETED SUCCESSFULLY ---`
    );
    process.exit(0); // Exit with a success code
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] --- DAILY CRON SEQUENCE FAILED ---`
    );
    console.error(error);
    process.exit(1); // Exit with an error code to signify failure
  }
}

void main();
