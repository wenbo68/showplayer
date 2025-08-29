import { db } from '~/server/db';
import {
  tmdbMedia,
  tmdbSeason,
  tmdbEpisode,
  tmdbSource,
} from '~/server/db/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { VideoPlayer } from '~/app/_components/player/VideoPlayer';
import { TvSelector } from '~/app/_components/player/TvSelector';
import { getProxiedSrcUrl } from '~/utils/api';
import { TvOverview } from '~/app/_components/player/TvOverview';

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

  // Parse params from the URL
  const tmdbId = parseInt(tmdbIdParam, 10);
  const seasonNumber = parseInt(seasonNumberParam, 10);
  const episodeNumber = parseInt(episodeNumberParam, 10);
  const provider = providerParam ? parseInt(providerParam, 10) : undefined;

  // Step 1. Fetch the main media data, including all seasons and episodes for the sidebar
  const mediaData = await db.query.tmdbMedia.findFirst({
    where: eq(tmdbMedia.tmdbId, tmdbId),
    with: {
      seasons: {
        orderBy: [asc(tmdbSeason.seasonNumber)],
        with: {
          episodes: {
            orderBy: [asc(tmdbEpisode.episodeNumber)],
            with: {
              sources: {
                orderBy: [asc(tmdbSource.provider)],
              },
            },
          },
        },
      },
    },
  });

  // If the show doesn't exist, render a 404 page
  if (!mediaData) {
    notFound();
  }

  // Step 2. Find the specific season and episode the user is watching
  const selectedSeason = mediaData.seasons.find(
    (s) => s.seasonNumber === seasonNumber
  );
  if (!selectedSeason) notFound();
  const selectedEpisode = selectedSeason.episodes.find(
    (e) => e.episodeNumber === episodeNumber
  );
  if (!selectedEpisode) notFound();

  // Step 3. Fetch all available sources for the selected episode
  const sourcesWithSubtitles = await db.query.tmdbSource.findMany({
    where: eq(tmdbSource.episodeId, selectedEpisode.id),
    orderBy: [asc(tmdbSource.provider)],
    with: {
      subtitles: true,
    },
  });
  // if (!sources[0]) notFound();

  // If no provider is in the URL (and if there are providers), redirect to 1st provider
  if (!provider && sourcesWithSubtitles[0]) {
    return redirect(
      `/tv/${tmdbId}/${seasonNumber}/${episodeNumber}/${sourcesWithSubtitles[0].provider}`
    );
  }

  // Step 4. Find the selected source URL for the video player
  const selectedSrc = sourcesWithSubtitles.find((s) => s.provider === provider);
  // If a provider is in the URL (but doesn't exist for this media) then redirect to 1st provider (if providers exists)
  if (!selectedSrc && sourcesWithSubtitles[0]) {
    return redirect(
      `/tv/${tmdbId}/${seasonNumber}/${episodeNumber}/${sourcesWithSubtitles[0].provider}`
    );
  }

  // Step 5. construct the proxied src url with the original src url and headers included as params
  const proxiedSrcUrl = getProxiedSrcUrl(selectedSrc);

  // 6. find all subtitles
  const subtitles = sourcesWithSubtitles.flatMap((source, index) =>
    source.subtitles.map((subtitle) => ({
      content: subtitle.content,
      lang: subtitle.language.slice(0, 2).toLowerCase(), // e.g., "English" -> "en"
      label: `${subtitle.language} (${source.provider})`,
      default: source.id === selectedSrc?.id,
    }))
  );

  return (
    <div className="mx-auto p-4 max-w-6xl flex flex-col gap-2">
      {/* Title, Season, Episode */}
      <TvOverview
        selectedMedia={mediaData}
        selectedSeason={selectedSeason}
        selectedEpisode={selectedEpisode}
      />

      {/* Video Player */}
      <VideoPlayer
        episode={selectedEpisode}
        src={proxiedSrcUrl}
        subtitles={subtitles}
      />

      {/* Source/season/episode selector */}
      <TvSelector
        tmdbId={tmdbId}
        mediaData={mediaData}
        episodeSources={sourcesWithSubtitles}
        selectedProvider={provider ?? sourcesWithSubtitles[0]?.provider}
        selectedSeasonId={selectedSeason.id}
        selectedEpisodeId={selectedEpisode.id}
      />
    </div>
  );
}
