// ~/app/tv/[...slug]/page.tsx

import { db } from '~/server/db';
import {
  tmdbMedia,
  tmdbSeason,
  tmdbEpisode,
  tmdbSource,
  // type SrcProvider,
} from '~/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { VideoPlayer } from '~/app/_components/player/VideoPlayer';
// import { TvSelector } from '~/app/_components/player/TvSelector';
// import { getProxiedSrcUrl } from '~/server/utils/proxyUtils';
import {
  // aggregateSubtitles,
  // getSelectedSourceAndHandleRedirects,
  handleProvider,
} from '~/server/utils/playerUtils';
import { OverviewSelector } from '~/app/_components/player/OverviewSelector';
import { MediaSelector } from '~/app/_components/player/MediaSelector';
import { BackButton } from '~/app/_components/BackButton';
import type { SourceWithSubtitles } from '~/type';

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
  // If db doesn't have the show/season/episode, render a 404 page
  const mediaData = playerData;
  if (!mediaData || !sidebarData) notFound();
  const selectedSeason = mediaData.seasons[0];
  if (!selectedSeason) notFound();
  const selectedEpisode = selectedSeason.episodes[0];
  if (!selectedEpisode) notFound();
  // extract all src and sub of chosen episode
  const allProxiableSourcesAndSubtitles: SourceWithSubtitles[] =
    selectedEpisode.sources;

  const { provider, videoUrl, subtitles, proxiableUrlAndSubtitles } =
    handleProvider(
      'tv',
      allProxiableSourcesAndSubtitles,
      tmdbId,
      providerParam,
      seasonNumber,
      episodeNumber
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
        selectedSeason={selectedSeason}
        selectedEpisode={selectedEpisode}
      />
      <VideoPlayer
        src={videoUrl}
        episode={selectedEpisode}
        subtitles={subtitles}
        playerType={proxiableUrlAndSubtitles === null ? 'iframe' : 'hls'}
      />

      {/* Pass the full tree data to the sidebar */}
      <MediaSelector
        sources={allProxiableSourcesAndSubtitles}
        selectedProvider={provider ?? 'E!'}
        tmdbId={tmdbId}
        mediaData={sidebarData}
        selectedSeasonId={selectedSeason.id}
        selectedEpisodeId={selectedEpisode.id}
      />
    </>
  );
}
