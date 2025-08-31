import { api, HydrateClient } from '~/trpc/server';
import MediaList from '~/app/_components/media/MediaList';

export default async function TrendingPage() {
  try {
    await api.media.getTmdbTrending.prefetch();
    await api.media.getTmdbTrending.prefetch();
    await api.media.getTmdbTrending.prefetch();
  } catch (error) {
    console.log(`Prefetch failed: `, error);
  }

  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center max-w-6xl mx-auto p-4 gap-8">
        {/* full trending list */}
        <MediaList viewMode="full" mediaType="trending" />
      </main>
    </HydrateClient>
  );
}
