// ~/scripts/runDailyCron.ts

import 'dotenv/config';
import { appRouter } from '~/server/api/root.js'; // <-- ADDED .js
import { createTRPCContext } from '~/server/api/trpc.js'; // <-- ADDED .js

/**
 * This is the entry point for our daily cron job.
 */
async function main() {
  console.log(
    `[${new Date().toISOString()}] --- STARTING DAILY CRON SEQUENCE ---`
  );

  const ctx = await createTRPCContext({ headers: new Headers() });
  const caller = appRouter.createCaller({
    ...ctx,
    session: {
      user: {
        id: 'system-cron',
        name: 'Cron Job',
        email: 'cron@system.local',
        role: 'admin',
      },
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  });

  try {
    await caller.cron.runCron({ tmdbListLimit: 50 });
    console.log(
      `[${new Date().toISOString()}] --- DAILY CRON SEQUENCE COMPLETED SUCCESSFULLY ---`
    );
    process.exit(0);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] --- DAILY CRON SEQUENCE FAILED ---`
    );
    console.error(error);
    process.exit(1);
  }
}

void main();
