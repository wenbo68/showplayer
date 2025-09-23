// ~/app/api/stop-cron/route.ts -- THIS GOES ON YOUR VPS DEPLOYMENT

import { NextResponse } from 'next/server';
import { appRouter } from '~/server/api/root';
import { createTRPCContext } from '~/server/api/trpc';
import { env } from '~/env';

export async function GET(request: Request) {
  // 1. Secure the endpoint with the same secret key
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

  // 3. Trigger the stop procedure without awaiting it
  caller.cron.stopCron({}).catch((error) => {
    console.error(
      '[CRON JOB] The stopCron procedure failed on the VPS:',
      error
    );
  });

  // 4. Immediately respond to confirm the request was received
  return NextResponse.json({
    success: true,
    message: 'Cron stop sequence initiated on VPS.',
  });
}
