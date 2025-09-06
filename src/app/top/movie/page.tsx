import { api, HydrateClient } from '~/trpc/server';
import MediaList from '~/app/_components/media/MediaList';

export default async function TopMvPage() {
  const topMvList = await api.media.getTmdbTopRatedMv();

  return (
    <div className="flex flex-col items-center justify-center p-4 gap-8">
      <MediaList
        pageMediaIds={topMvList.map((listMedia) => listMedia.media.id)}
        mediaList={topMvList}
        viewMode="full"
        label="TOP MOVIES"
      />
    </div>
  );
}
