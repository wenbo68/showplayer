// ~/app/search/page.tsx

import { api } from '~/trpc/server';
import SearchBar from '../_components/search/SearchBar';
import MediaList from '../_components/media/MediaList';

// Helper function to ensure a value is an array of strings
const ensureStringArray = (value: string | string[] | undefined): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  // 1. Parse URL search params into the format your tRPC procedure expects
  const searchInput = {
    query: typeof params.query === 'string' ? params.query : undefined,
    types: ensureStringArray(params.types) as ('movie' | 'tv')[] | undefined,
    genres: ensureStringArray(params.genres).map(Number),
    origins: ensureStringArray(params.origins),
    years: ensureStringArray(params.years).map(Number),
  };

  // 2. Fetch the search results from your tRPC procedure on the server
  const searchResults = await api.media.searchAndFilter(searchInput);
  const filterOptions = await api.media.getFilterOptions();

  return (
    <main className="flex flex-col gap-8 p-4">
      {/* Include the SearchBar so users can refine their search */}
      <SearchBar filterOptions={filterOptions} />

      {/* 3. Conditionally render the results or a 'not found' message */}
      {searchResults && searchResults.length > 0 ? (
        <MediaList viewMode="full" mediaList={searchResults} />
      ) : (
        <div className="w-full flex h-64 items-center justify-center rounded-lg bg-gray-800">
          <p className="text-gray-400">No results found for your query.</p>
        </div>
      )}
    </main>
  );
}
