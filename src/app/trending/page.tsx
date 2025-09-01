import { api, HydrateClient } from '~/trpc/server';
import MediaList from '~/app/_components/media/MediaList';

export default async function TrendingPage() {
  const trendingList = await api.media.getTmdbTrending();
  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center p-4 gap-8">
        <MediaList
          mediaList={trendingList}
          viewMode="full"
          label="TRENDING NOW"
        />
      </main>
    </HydrateClient>
  );
}
