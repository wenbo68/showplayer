import { api, HydrateClient } from '~/trpc/server';
import TmdbAdmin from './_components/TmdbAdmin';
import RankedList from './_components/media/RankedList';
import SearchBar from './_components/search/SearchBar';
import SearchResult from './_components/search/SearchResult';

// Helper function to check if any search params are active
const isSearchActive = async (
  params: Promise<{
    [key: string]: string | string[] | undefined;
  }>
): Promise<boolean> => {
  return Object.values(await params).some(
    (value) => value !== undefined && value !== ''
  );
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchActive = isSearchActive(searchParams);

  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center max-w-7xl mx-auto p-4 gap-8">
        <TmdbAdmin />

        {/* Always display search and filter controls */}
        <SearchBar />

        {/* --- Conditional Rendering Logic --- */}
        {(await searchActive) ? (
          // If a search is active, show the results
          <SearchResult searchParams={await searchParams} />
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
