// ~/app/api/trigger-cron/route.ts -- THIS GOES ON YOUR VPS DEPLOYMENT

import { NextResponse } from 'next/server';
import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { env } from '~/env';

export async function GET(request: Request) {
  // 1. Secure the endpoint with a secret key
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('cronSecret');

  if (cronSecret !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Create a tRPC server-side caller with a mock admin session
  const ctx = await createTRPCContext({ headers: request.headers });
  const caller = appRouter.createCaller({
    ...ctx,
    session: {
      user: {
        id: 'system-cron',
        name: 'Cron Job',
        email: 'cron@system.local',
        role: 'admin',
      },
      expires: new Date(Date.now() + 1000 * 60).toISOString(),
    },
  });

  // 3. Trigger the long-running job but DO NOT await it
  caller.cron.runCron({ jobType: 'userSubmissions' }).catch((error) => {
    console.error('[CRON JOB] The runCron procedure failed on the VPS:', error);
  });

  // 4. Immediately respond
  return NextResponse.json({
    success: true,
    message: 'Cron sequence initiated on VPS.',
  });
}
