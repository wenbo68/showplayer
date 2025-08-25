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
      <main className="flex flex-col items-center justify-center max-w-6xl mx-auto p-4">
        <TmdbAdmin />
        <TrendingList />
      </main>
    </HydrateClient>
  );
}
