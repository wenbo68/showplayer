import { db } from '~/server/db';
import { tmdbMedia, tmdbSource } from '~/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { VideoPlayer } from '~/app/_components/player/VideoPlayer';
// import { SourceSelector } from '~/app/_components/player/SourceSelector';
// import { getProxiedSrcUrl } from '~/server/utils/proxyUtils';
import {
  // aggregateSubtitles,
  // getSelectedSourceAndHandleRedirects,
  handleProvider,
} from '~/server/utils/playerUtils';
import { OverviewSelector } from '~/app/_components/player/OverviewSelector';
import { MediaSelector } from '~/app/_components/player/MediaSelector';
import { BackButton } from '~/app/_components/BackButton';
// import type { SrcProviderPlusEmbed } from '~/type';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const [tmdbIdParam, providerParam] = slug;
  if (!tmdbIdParam) {
    return notFound();
  }

  const tmdbId = parseInt(tmdbIdParam, 10);
  // 1. get media data using tmdb id and media type
  const mediaData = await db.query.tmdbMedia.findFirst({
    where: and(eq(tmdbMedia.tmdbId, tmdbId), eq(tmdbMedia.type, 'movie')),
    with: {
      genres: { with: { genre: true } },
      origins: { with: { origin: true } },
      sources: {
        orderBy: asc(tmdbSource.provider),
        with: { subtitles: true },
      },
    },
  });
  // If db doesn't have the movie, render a 404 page
  if (!mediaData) notFound();
  // extract all src and sub
  const allProxiableSourcesAndSubtitles = mediaData.sources;

  const { provider, videoUrl, subtitles, proxiableUrlAndSubtitles } =
    handleProvider(
      'movie',
      allProxiableSourcesAndSubtitles,
      tmdbId,
      providerParam
    );

  return (
    <>
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
        src={videoUrl}
        subtitles={subtitles}
        playerType={proxiableUrlAndSubtitles === null ? 'iframe' : 'hls'}
      />

      {/* Source Selector Component */}
      <MediaSelector
        sources={allProxiableSourcesAndSubtitles}
        selectedProvider={provider ?? 'E!'}
      />
    </>
  );
}
