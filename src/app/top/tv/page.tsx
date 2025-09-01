import { api, HydrateClient } from '~/trpc/server';
import MediaList from '~/app/_components/media/MediaList';

export default async function TopTvPage() {
  const topTvList = await api.media.getTmdbTopRatedTv();
  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center p-4 gap-8">
        <MediaList mediaList={topTvList} viewMode="full" label="TOP SHOWS" />
      </main>
    </HydrateClient>
  );
}
