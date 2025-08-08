import { db } from '~/server/db';
import {
  tmdbMedia,
  tmdbSeason,
  tmdbEpisode,
  tmdbSource,
} from '~/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { VideoPlayer } from '~/app/_components/player/VideoPlayer';
import { SourceSelector } from '~/app/_components/player/SourceSelector';
import { EpisodeList } from '~/app/_components/player/EpisodeList';

interface PageProps {
  params: {
    slug: string[];
  };
}

// now the subtitles work (but vidjoy's subtitle seems to be off sync => maybe we turn off vidjoy subtitle by default since it already has subtitles baked in?)
// now we might wanna try testing other episodes/movies
// then we would bulk fetch the trending ones

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
  const selectedEpisode = selectedSeason?.episodes.find(
    (e) => e.episodeNumber === episode
  );

  if (!selectedEpisode) {
    notFound();
  }

  // Step 3. Fetch all available sources for the selected episode
  const sources = await db.query.tmdbSource.findMany({
    where: eq(tmdbSource.episodeId, selectedEpisode.id),
    with: {
      subtitles: true,
    },
  });

  if (!sources[0]) {
    notFound();
  }

  // If no provider is in the URL, redirect to the first available one
  if (!providerParam) {
    // Get the first source and redirect
    const firstSource = sources[0];
    // Assuming the source object has a 'provider' property (e.g., "vidsrc", "2embed")
    return redirect(
      `/tv/${tmdbId}/${season}/${episode}/${firstSource.provider}`
    );
  }

  // Step 4. Find the selected source URL for the video player
  const selectedSrc = sources.find((s) => s.provider === providerParam);

  // If a provider is in the URL but doesn't exist for this media, 404
  if (!selectedSrc) {
    notFound();
  }

  // Step 5. construct the proxy url with src url and headers included as params
  let playerSrc: string | undefined;

  // two ways to create url with params:
  // 1. encode params and append them to to url as strings (encode the urls so that they can be included in another url otherwise the special characters in the embeded urls can cause confusions)
  // 2. use URL obj and attach params (without encoding) as key/value
  if (selectedSrc) {
    const urlObject = new URL(`/api/proxy`, 'http://localhost');
    urlObject.searchParams.set('url', selectedSrc.url);

    if (selectedSrc.headers && typeof selectedSrc.headers === 'object') {
      for (const [key, value] of Object.entries(selectedSrc.headers)) {
        if (typeof value === 'string') {
          urlObject.searchParams.set(key, value);
        }
      }
    }
    // final url = relative proxy path (/api/proxy) + params (playlist url + headers)
    playerSrc = urlObject.pathname + urlObject.search;
    // console.log(`playerSrc: `, playerSrc);
  }

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
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold">{mediaData.title}</h1>
      <h2 className="text-xl text-gray-400 mb-4">
        S{season.toString().padStart(2, '0')}E
        {episode.toString().padStart(2, '0')}
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3">
          {/* Video Player Component */}
          <VideoPlayer src={playerSrc} subtitles={subtitles} />

          {/* Source Selector Component */}
          <SourceSelector
            sources={sources}
            selectedProvider={providerParam ?? sources[0].provider}
          />

          <div className="mt-4 p-4 bg-gray-800 rounded">
            <h3 className="text-2xl font-semibold">
              {selectedEpisode.title ?? `Episode ${episode}`}
            </h3>
            <p className="text-gray-300 mt-2">{selectedEpisode.description}</p>
          </div>
        </div>

        <div className="lg:col-span-1">
          {/* Episode List Component */}
          <EpisodeList
            tmdbId={tmdbId}
            seasons={mediaData.seasons}
            selectedEpisodeId={selectedEpisode.id}
          />
        </div>
      </div>
    </div>
  );
}
