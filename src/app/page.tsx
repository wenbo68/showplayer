import { api, HydrateClient } from '~/trpc/server';
import TmdbAdmin from './_components/TmdbAdmin';
import MediaList from './_components/media/MediaList';

export default async function Home() {
  try {
    await api.media.tmdbTrending.prefetch();
    await api.media.tmdbTrending.prefetch();
    await api.media.tmdbTrending.prefetch();
  } catch (error) {
    console.log(`Prefetch failed: `, error);
  }

  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center max-w-6xl mx-auto p-4 gap-8">
        <TmdbAdmin />
        {/* 1. Trending List */}
        <MediaList
          viewMode="preview"
          mediaType="trending"
          // viewAllLink="/trending"
        />

        {/* 2. Top Rated Movies List */}
        <MediaList
          viewMode="preview"
          mediaType="top mv"
          // viewAllLink="/top/movie"
        />

        {/* 3. Top Rated TV List */}
        <MediaList
          viewMode="preview"
          mediaType="top tv"
          // viewAllLink="/top/tv"
        />
      </main>
    </HydrateClient>
  );
}
