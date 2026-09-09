import { db } from '~/server/db';
import { tmdbMedia } from '~/server/db/schema';
import { and, eq } from 'drizzle-orm';
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
    },
  });
  // If db doesn't have the movie, render a 404 page
  if (!mediaData) notFound();

  // 2. resolve the embed provider (redirects if missing/invalid)
  const { provider, videoUrl } = handleProvider('movie', tmdbId, providerParam);

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

      <VideoPlayer movie={mediaData} src={videoUrl} />

      <MediaSelector selectedProvider={provider} />
    </>
  );
}
