// ~/app/api/cron-trigger-vps/route.ts -- THIS GOES ON YOUR VERCEL DEPLOYMENT

import { NextResponse } from 'next/server';
import { env } from '~/env';

export async function GET(request: Request) {
  // This function runs on Vercel.

  // 1. Secure this endpoint so only Vercel Cron can call it.
  const { searchParams } = new URL(request.url);
  const cronSecret = searchParams.get('cronSecret');
  if (cronSecret !== env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. The URL of your VPS's trigger endpoint.
  //    Make sure to add VPS_API_URL to your Vercel environment variables.
  const vpsTriggerUrl = `${env.VPS_URL}/api/trigger-cron?cronSecret=${env.CRON_SECRET}`;

  // 3. "Fire-and-forget" the request to your VPS. We don't wait for it.
  fetch(vpsTriggerUrl).catch((err) => {
    console.error('Failed to trigger VPS cron job:', err);
  });

  // 4. Immediately respond to the Vercel scheduler.
  return NextResponse.json({
    success: true,
    message: 'VPS cron job triggered.',
  });
}
