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
import { SourceSelector } from '~/app/_components/player/SourceSelector';
import { TvSelector } from '~/app/_components/player/SeasonEpisodeSelector';
import { getProxiedSrcUrl } from '~/utils/api';

interface PageProps {
  params: Promise<{ slug: string[] }>;
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params;
  const [tmdbIdParam, seasonParam, episodeParam, providerParam] = slug;

  if (!tmdbIdParam || !seasonParam || !episodeParam) {
    return notFound();
  }

  // Parse params from the URL
  const tmdbId = parseInt(tmdbIdParam, 10);
  const season = parseInt(seasonParam, 10);
  const episode = parseInt(episodeParam, 10);

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
              sources: true,
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
    (s) => s.seasonNumber === season
  );
  if (!selectedSeason) notFound();
  const selectedEpisode = selectedSeason.episodes.find(
    (e) => e.episodeNumber === episode
  );
  if (!selectedEpisode) notFound();

  // Step 3. Fetch all available sources for the selected episode
  const sources = await db.query.tmdbSource.findMany({
    where: eq(tmdbSource.episodeId, selectedEpisode.id),
    orderBy: [asc(tmdbSource.provider)],
    with: {
      subtitles: true,
    },
  });
  // if (!sources[0]) notFound();

  // If no provider is in the URL (and if there are providers), redirect to 1st provider
  if (!providerParam && sources[0]) {
    return redirect(
      `/tv/${tmdbId}/${season}/${episode}/${sources[0].provider}`
    );
  }

  // Step 4. Find the selected source URL for the video player
  const selectedSrc = sources.find((s) => s.provider === providerParam);
  // If a provider is in the URL (but doesn't exist for this media) then redirect to 1st provider (if providers exists)
  if (!selectedSrc && sources[0]) {
    return redirect(
      `/tv/${tmdbId}/${season}/${episode}/${sources[0].provider}`
    );
  }

  // Step 5. construct the proxied src url with the original src url and headers included as params
  const proxiedSrcUrl = getProxiedSrcUrl(selectedSrc);

  // 6. find all subtitles
  const subtitles = sources.flatMap((source, index) =>
    source.subtitles.map((sub) => ({
      content: sub.content,
      lang: sub.language.slice(0, 2).toLowerCase(), // e.g., "English" -> "en"
      label: `${sub.language} (${source.provider})`,
      default: source.id === selectedSrc?.id,
    }))
  );

  return (
    <div className="mx-auto p-4 max-w-7xl flex flex-col gap-2">
      {/* Title, Season, Episode */}
      <div className="flex w-full justify-between items-end">
        <span className="text-2xl font-bold">{mediaData.title}</span>
        <span className="text-xl font-bold">
          S{season.toString()} E{episode.toString()}
        </span>
      </div>

      {/* Video Player Component */}
      <VideoPlayer src={proxiedSrcUrl} subtitles={subtitles} />

      {/* Episode List Component */}
      <TvSelector
        tmdbId={tmdbId}
        mediaData={mediaData}
        sources={sources}
        selectedProvider={providerParam ?? sources[0]?.provider}
        selectedSeasonId={selectedSeason.id}
        selectedEpisodeId={selectedEpisode.id}
      />
    </div>
  );
}
