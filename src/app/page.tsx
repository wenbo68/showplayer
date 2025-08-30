import { api, HydrateClient } from '~/trpc/server';
import TmdbAdmin from './_components/TmdbAdmin';
import RankedList from './_components/media/RankedList';
import SearchBar from './_components/SearchBar';
import SearchResult from './_components/SearchResult';

// Helper function to check if any search params are active
const isSearchActive = (params: {
  [key: string]: string | string[] | undefined;
}): boolean => {
  return Object.values(params).some(
    (value) => value !== undefined && value !== ''
  );
};

export default async function Home({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const searchActive = isSearchActive(searchParams);

  if (!searchActive) {
    try {
      await api.media.tmdbTrending.prefetch();
      await api.media.tmdbTrending.prefetch();
      await api.media.tmdbTrending.prefetch();
    } catch (error) {
      console.log(`Prefetch failed: `, error);
    }
  }

  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center max-w-6xl mx-auto p-4 gap-8">
        <TmdbAdmin />

        {/* Always display search and filter controls */}
        <SearchBar />

        {/* --- Conditional Rendering Logic --- */}
        {searchActive ? (
          // If a search is active, show the results
          <SearchResult searchParams={searchParams} />
        ) : (
          <>
            {/* 1. Trending List */}
            <RankedList
              viewMode="preview"
              mediaType="trending"
              // viewAllLink="/trending"
            />

            {/* 2. Top Rated Movies List */}
            <RankedList
              viewMode="preview"
              mediaType="top mv"
              // viewAllLink="/top/movie"
            />

            {/* 3. Top Rated TV List */}
            <RankedList
              viewMode="preview"
              mediaType="top tv"
              // viewAllLink="/top/tv"
            />
          </>
        )}
      </main>
    </HydrateClient>
  );
}
