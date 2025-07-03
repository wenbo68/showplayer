// app/api/refreshAnime/route.ts
import { NextRequest, NextResponse } from "next/server";
import { api } from "~/trpc/server";

export async function POST(req: NextRequest) {
  try {
    await api.media.populateAnime();
    return NextResponse.json(
      { message: "Anime data populated successfully." },
      { status: 200 }
    );
  } catch (error) {
    console.error("refreshAnime error:", error);
    return NextResponse.json(
      { error: "Failed to populate anime data." },
      { status: 500 }
    );
  }
}
