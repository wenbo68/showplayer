import { NextRequest, NextResponse } from "next/server";

import { refreshAnime } from "~/lib/refreshMedia";

export async function GET(req: NextRequest) {
  if (
    req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await refreshAnime();
  // Add refreshMovies(), refreshShows() as needed
  return NextResponse.json({ success: true });
}
