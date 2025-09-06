import { api, HydrateClient } from '~/trpc/server';
import MediaList from '~/app/_components/media/MediaList';

export default async function TopTvPage() {
  const topTvList = await api.media.getTmdbTopRatedTv();
  return (
    <div className="flex flex-col items-center justify-center p-4 gap-8">
      <MediaList
        pageMediaIds={topTvList.map((listMedia) => listMedia.media.id)}
        mediaList={topTvList}
        viewMode="full"
        label="TOP SHOWS"
      />
    </div>
  );
}
