import { api, HydrateClient } from '~/trpc/server';
import MediaList from '~/app/_components/media/MediaList';

export default async function TopMvPage() {
  const topMvList = await api.media.getTmdbTopRatedMv();

  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center p-4 gap-8">
        <MediaList mediaList={topMvList} viewMode="full" label="TOP MOVIES" />
      </main>
    </HydrateClient>
  );
}
