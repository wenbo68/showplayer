// ~/app/tv/[...slug]/page.tsx

import { db } from '~/server/db';
import { tmdbMedia, tmdbSeason, tmdbEpisode } from '~/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { VideoPlayer } from '~/app/_components/player/VideoPlayer';
import { handleProvider } from '~/server/utils/playerUtils';
import { OverviewSelector } from '~/app/_components/player/OverviewSelector';
import { MediaSelector } from '~/app/_components/player/MediaSelector';
import { BackButton } from '~/app/_components/BackButton';

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
            },
          },
        },
      },
    }),
    // Query 2: Gets the full season/episode tree for the selector sidebar
    db.query.tmdbMedia.findFirst({
      where: eq(tmdbMedia.tmdbId, tmdbId),
      with: {
        seasons: {
          orderBy: [asc(tmdbSeason.seasonNumber)],
          with: {
            episodes: {
              orderBy: [asc(tmdbEpisode.episodeNumber)],
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

  // 2. resolve the embed provider (redirects if missing/invalid)
  const { provider, videoUrl } = handleProvider(
    'tv',
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
      <VideoPlayer src={videoUrl} episode={selectedEpisode} />

      <MediaSelector
        selectedProvider={provider}
        tmdbId={tmdbId}
        mediaData={sidebarData}
        selectedSeasonId={selectedSeason.id}
        selectedEpisodeId={selectedEpisode.id}
      />
    </>
  );
}
