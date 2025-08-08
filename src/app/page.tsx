import { api, HydrateClient } from '~/trpc/server';
import TmdbAdmin from './_components/TmdbAdmin';
import TrendingList from './_components/media/TrendingList';

export default async function Home() {
  void api.media.tmdbTrendingWithDetails.prefetch();
  // void api.media.anilistTrending.prefetch();

  return (
    <HydrateClient>
      <main className="p-8 flex flex-col items-center justify-center">
        <TmdbAdmin />
        <TrendingList />
      </main>
    </HydrateClient>
  );
}
