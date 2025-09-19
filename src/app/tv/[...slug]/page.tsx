// ~/app/tv/[...slug]/page.tsx

import { db } from '~/server/db';
import {
  tmdbMedia,
  tmdbSeason,
  tmdbEpisode,
  tmdbSource,
  type SrcProvider,
} from '~/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { VideoPlayer } from '~/app/_components/player/VideoPlayer';
// import { TvSelector } from '~/app/_components/player/TvSelector';
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
  const [tmdbIdParam, seasonNumberParam, episodeNumberParam, providerParam] =
    slug;

  if (!tmdbIdParam || !seasonNumberParam || !episodeNumberParam) {
    return notFound();
  }

  const tmdbId = parseInt(tmdbIdParam, 10);
  const seasonNumber = parseInt(seasonNumberParam, 10);
  const episodeNumber = parseInt(episodeNumberParam, 10);
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

  // --- 1. RUN TWO TARGETED QUERIES IN PARALLEL ---
  const [playerData, sidebarData] = await Promise.all([
    // Query 1: Gets only the data needed for the player and overview
    db.query.tmdbMedia.findFirst({
      where: eq(tmdbMedia.tmdbId, tmdbId),
      with: {
        genres: { with: { genre: true } },
        origins: { with: { origin: true } },
        seasons: {
          where: eq(tmdbSeason.seasonNumber, seasonNumber),
          with: {
            episodes: {
              where: eq(tmdbEpisode.episodeNumber, episodeNumber),
              with: {
                sources: {
                  orderBy: [asc(tmdbSource.provider)],
                  with: { subtitles: true },
                },
              },
            },
          },
        },
      },
    }),
    // Query 2: Gets the full data tree needed for the TvSelector sidebar
    db.query.tmdbMedia.findFirst({
      where: eq(tmdbMedia.tmdbId, tmdbId),
      with: {
        seasons: {
          orderBy: [asc(tmdbSeason.seasonNumber)],
          with: {
            episodes: {
              orderBy: [asc(tmdbEpisode.episodeNumber)],
              with: {
                sources: {
                  columns: { provider: true }, // Only need provider for styling
                },
              },
            },
          },
        },
      },
    }),
  ]);

  const mediaData = playerData;
  if (!mediaData || !sidebarData) notFound();

  const selectedSeason = mediaData.seasons[0];
  if (!selectedSeason) notFound();

  const selectedEpisode = selectedSeason.episodes[0];
  if (!selectedEpisode) notFound();

  const sourcesAndSubtitles = selectedEpisode.sources;

  // 2. Replace the manual redirect logic with a single call to the helper
  const baseRedirectUrl = `/tv/${tmdbId}/${seasonNumber}/${episodeNumber}`;
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
        selectedSeason={selectedSeason}
        selectedEpisode={selectedEpisode}
      />
      <VideoPlayer
        src={proxiedSrcUrl}
        episode={selectedEpisode}
        subtitles={subtitles}
      />

      {/* Pass the full tree data to the sidebar */}
      <MediaUrlSelector
        sources={sourcesAndSubtitles}
        selectedProvider={provider ?? sourcesAndSubtitles[0]?.provider}
        tmdbId={tmdbId}
        mediaData={sidebarData}
        selectedSeasonId={selectedSeason.id}
        selectedEpisodeId={selectedEpisode.id}
      />
    </div>
  );
}
