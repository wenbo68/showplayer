import { api, HydrateClient } from '~/trpc/server';
import MediaList from '~/app/_components/media/MediaList';
import RankedList from '../_components/media/RankedList';

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
      <main className="flex flex-col items-center justify-center p-4 gap-8">
        {/* full trending list */}
        <RankedList viewMode="full" mediaType="trending" />
      </main>
    </HydrateClient>
  );
}
