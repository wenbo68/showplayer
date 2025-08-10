import { api, HydrateClient } from '~/trpc/server';
import TmdbAdmin from './_components/TmdbAdmin';
import TrendingList from './_components/TrendingList';

export default async function Home() {
  try {
    await api.media.tmdbTrendingWithDetails.prefetch();
  } catch (err) {
    console.error('Prefetch failed:', err);
  }

  return (
    <HydrateClient>
      <main className="p-8 flex flex-col items-center justify-center">
        <TmdbAdmin />
        <TrendingList />
      </main>
    </HydrateClient>
  );
}
