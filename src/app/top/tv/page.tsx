import { api, HydrateClient } from '~/trpc/server';
import MediaList from '~/app/_components/media/MediaList';

export default async function TopTvPage() {
  try {
    await api.media.tmdbTrending.prefetch();
    await api.media.tmdbTrending.prefetch();
    await api.media.tmdbTrending.prefetch();
  } catch (error) {
    console.log(`Prefetch failed: `, error);
  }

  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center max-w-6xl mx-auto p-4 gap-8">
        {/* full top tv list */}
        <MediaList viewMode="full" mediaType="top tv" />
      </main>
    </HydrateClient>
  );
}
