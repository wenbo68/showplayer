// ~/app/search/page.tsx

import { api, HydrateClient } from '~/trpc/server';
import SearchBar from '../_components/search/SearchBar';
import MediaList from '../_components/media/MediaList';
import { Suspense } from 'react';
import SearchBarFallback from '../_components/search/SearchBarFallback';
import ActiveFilters from '../_components/search/ActiveFilters';

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

  const trpcSearchAndFilterInput = {
    title: typeof params.title === 'string' ? params.title : undefined,
    year: ensureStringArray(params.year).map(Number),
    format: ensureStringArray(params.format) as ('movie' | 'tv')[],
    origin: ensureStringArray(params.origin),
    genre: ensureStringArray(params.genre).map(Number),
    order:
      typeof params.order === 'string'
        ? (params.order as
            | 'date-desc'
            | 'date-asc'
            | 'title-desc'
            | 'title-asc')
        : undefined,
  };

  // get results from trpc
  const searchResults = await api.media.searchAndFilter(
    trpcSearchAndFilterInput
  );

  // prefetch for client cache
  const pageMediaIds = searchResults.map((m) => m.media.id);
  const uniquePageMediaIds = [...new Set(pageMediaIds)];
  api.media.getUserDetailsForMediaList.prefetch({
    mediaIds: uniquePageMediaIds,
  });

  // get filter options from trpc
  const filterOptions = await api.media.getFilterOptions();

  return (
    <div className="flex flex-col gap-10 p-4">
      <Suspense fallback={<SearchBarFallback />}>
        <SearchBar filterOptions={filterOptions} />
      </Suspense>

      <ActiveFilters filterOptions={filterOptions} />

      <HydrateClient>
        {searchResults && searchResults.length > 0 ? (
          <MediaList
            viewMode="full"
            mediaList={searchResults}
            pageMediaIds={uniquePageMediaIds}
          />
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-lg bg-gray-800">
            <p className="text-gray-400">No results found for your query.</p>
          </div>
        )}
      </HydrateClient>
    </div>
  );
}
