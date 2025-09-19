import { db } from '~/server/db';
import { tmdbMedia, tmdbSource, type SrcProvider } from '~/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { VideoPlayer } from '~/app/_components/player/VideoPlayer';
// import { SourceSelector } from '~/app/_components/player/SourceSelector';
import { getProxiedSrcUrl } from '~/server/utils/proxyUtils';
import {
  aggregateSubtitles,
  getSelectedSourceAndHandleRedirects,
} from '~/server/utils/playerUtils';
import { OverviewSelector } from '~/app/_components/player/OverviewSelector';
import { MediaUrlSelector } from '~/app/_components/player/MediaUrlSelector';
import { BackButton } from '~/app/_components/player/BackButton';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const [tmdbIdParam, providerParam] = slug;

  if (!tmdbIdParam) {
    return notFound();
  }

  // Parse params from the URL
  const tmdbId = parseInt(tmdbIdParam, 10);
  const provider: SrcProvider | undefined =
    providerParam === 'E'
      ? providerParam
      : providerParam === 'F'
      ? providerParam
      : providerParam === 'L'
      ? providerParam
      : providerParam === 'J'
      ? providerParam
      : undefined;

  // Step 1. Fetch the movie data, including all its sources and their subtitles in one query
  const mediaData = await db.query.tmdbMedia.findFirst({
    where: eq(tmdbMedia.tmdbId, tmdbId),
    with: {
      genres: { with: { genre: true } },
      origins: { with: { origin: true } },
      sources: {
        orderBy: asc(tmdbSource.provider),
        with: { subtitles: true },
      },
    },
  });

  // If the movie or its sources don't exist, render a 404 page
  if (!mediaData) notFound();

  const sourcesAndSubtitles = mediaData.sources;

  // 2. Replace the manual redirect logic with a single call to the helper
  const baseRedirectUrl = `/movie/${tmdbId}`;
  const selectedSrc = getSelectedSourceAndHandleRedirects(
    baseRedirectUrl,
    sourcesAndSubtitles,
    provider
  );

  // 3. Replace the manual subtitle aggregation with a single call to the helper
  const proxiedSrcUrl = getProxiedSrcUrl(selectedSrc ?? undefined);
  const subtitles = aggregateSubtitles(sourcesAndSubtitles, selectedSrc?.id);

  return (
    <div className="flex flex-col gap-4">
      <BackButton />

      <OverviewSelector
        selectedMedia={{
          media: mediaData,
          origins: mediaData.origins?.map((o) => o.origin?.name ?? '') ?? [],
          genres: mediaData.genres?.map((g) => g.genre?.name ?? '') ?? [],
        }}
      />

      {/* Video Player Component */}
      <VideoPlayer
        movie={mediaData}
        src={proxiedSrcUrl}
        subtitles={subtitles}
      />

      {/* Source Selector Component */}
      <MediaUrlSelector
        sources={sourcesAndSubtitles}
        selectedProvider={provider ?? sourcesAndSubtitles[0]?.provider}
      />
    </div>
  );
}
