import { db } from '~/server/db';
import { tmdbMedia, tmdbSource } from '~/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { VideoPlayer } from '~/app/_components/player/VideoPlayer';
import { SourceSelector } from '~/app/_components/player/SourceSelector';
import { getProxiedSrcUrl } from '~/utils/api';
import { MvOverview } from '~/app/_components/player/MvOverview';

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
  const provider = providerParam ? parseInt(providerParam, 10) : undefined;

  // Step 1. Fetch the movie data, including all its sources and their subtitles in one query
  const mediaData = await db.query.tmdbMedia.findFirst({
    where: eq(tmdbMedia.tmdbId, tmdbId),
    with: {
      // For movies, we fetch sources directly linked to the mediaId
      sources: {
        orderBy: asc(tmdbSource.provider),
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

  const sourcesWithSubtitles = mediaData.sources;

  // if (!sourcesWithSubtitles[0]) {
  //   notFound();
  // }

  // Step 2. If no provider is in the URL, redirect to the 1st available one (if there is a provider)
  if (!provider && sourcesWithSubtitles[0]) {
    return redirect(`/movie/${tmdbId}/${sourcesWithSubtitles[0].provider}`);
  }

  // Step 3. Find the selected source based on the provider in the URL
  const selectedSrc = sourcesWithSubtitles.find((s) => s.provider === provider);

  // If a provider is in the URL (but doesn't exist for this media) then redirect to 1st available one (if there is a provider)
  if (!selectedSrc && sourcesWithSubtitles[0]) {
    return redirect(`/movie/${tmdbId}/${sourcesWithSubtitles[0].provider}`);
  }

  // Step 4. Construct the proxy URL for the video player
  // This includes the source URL and any necessary headers as search parameters.
  const proxiedSrcUrl = getProxiedSrcUrl(selectedSrc);

  // Step 5. Aggregate all subtitles from all available sources
  const subtitles = sourcesWithSubtitles.flatMap((source, index) =>
    source.subtitles.map((subtitle) => ({
      content: subtitle.content,
      lang: subtitle.language.slice(0, 2).toLowerCase(),
      label: `${subtitle.language} (${source.provider})`,
      default: source.id === selectedSrc?.id,
    }))
  );

  return (
    <div className="mx-auto p-4 max-w-6xl flex flex-col gap-2">
      <MvOverview selectedMedia={mediaData} />

      {/* Video Player Component */}
      <VideoPlayer
        movie={mediaData}
        src={proxiedSrcUrl}
        subtitles={subtitles}
      />

      {/* Source Selector Component */}
      <SourceSelector
        sources={sourcesWithSubtitles}
        selectedProvider={provider ?? sourcesWithSubtitles[0]?.provider}
      />
    </div>
  );
}
