import { db } from '~/server/db';
import { tmdbMedia } from '~/server/db/schema';
import { eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { VideoPlayer } from '~/app/_components/player/VideoPlayer';
import { SourceSelector } from '~/app/_components/player/SourceSelector';

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

  // Step 1. Fetch the movie data, including all its sources and their subtitles in one query
  const mediaData = await db.query.tmdbMedia.findFirst({
    where: eq(tmdbMedia.tmdbId, tmdbId),
    with: {
      // For movies, we fetch sources directly linked to the mediaId
      sources: {
        with: {
          subtitles: true,
        },
      },
    },
  });

  // If the movie or its sources don't exist, render a 404 page
  if (!mediaData) {
    notFound();
  }

  const sources = mediaData.sources;

  if (!sources[0]) {
    notFound();
  }

  // Step 2. If no provider is in the URL, redirect to the first available one
  if (!providerParam) {
    const firstSource = sources[0];
    return redirect(`/mv/${tmdbId}/${firstSource.provider}`);
  }

  // Step 3. Find the selected source based on the provider in the URL
  const selectedSrc = sources.find((s) => s.provider === providerParam);

  // If a provider is in the URL but doesn't exist for this media, 404
  if (!selectedSrc) {
    notFound();
  }

  // Step 4. Construct the proxy URL for the video player
  // This includes the source URL and any necessary headers as search parameters.
  let playerSrc: string | undefined;

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
    playerSrc = urlObject.pathname + urlObject.search;
  }

  // Step 5. Aggregate all subtitles from all available sources
  const subtitles = sources.flatMap((source, index) =>
    source.subtitles.map((sub) => ({
      content: sub.content,
      lang: sub.language.slice(0, 2).toLowerCase(),
      label: `${sub.language} (${source.provider.substring(3)})`,
      default: source.id === selectedSrc?.id,
    }))
  );

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">{mediaData.title}</h1>

      <div className="w-full">
        {/* Video Player Component */}
        <VideoPlayer src={playerSrc} subtitles={subtitles} />

        {/* Source Selector Component */}
        <SourceSelector
          sources={sources}
          selectedProvider={providerParam ?? sources[0].provider}
        />

        {/* Movie Description */}
        <div className="mt-4 p-4 bg-gray-800 rounded">
          <h3 className="text-2xl font-semibold">{mediaData.title}</h3>
          <p className="text-gray-300 mt-2">{mediaData.description}</p>
        </div>
      </div>
    </div>
  );
}
