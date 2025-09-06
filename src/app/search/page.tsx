// ~/app/search/page.tsx

import { api, HydrateClient } from '~/trpc/server';
import SearchBar from '../_components/search/SearchBar';
import MediaList from '../_components/media/MediaList';
import { Suspense } from 'react';
import SearchBarFallback from '../_components/search/SearchBarFallback';
import ActiveFilters from '../_components/search/ActiveFilters';
import Pagination from '../_components/search/Pagination';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

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

  // --- 1. Check for missing required parameters ---
  const isOrderMissing = typeof params.order !== 'string';
  const isPageMissing = typeof params.page !== 'string';

  // --- 2. If any parameter is missing, redirect to a complete URL ---
  if (isOrderMissing || isPageMissing) {
    // Create a mutable copy of the current params
    const newParams = new URLSearchParams(params as Record<string, string>);

    // Add the defaults if they are missing
    if (isOrderMissing) {
      // 2. get user's last used order from cookie or use default
      const cookieStore = await cookies();
      const lastUsedOrder =
        cookieStore.get('lastUsedOrder')?.value ?? 'date-desc';
      newParams.set('order', lastUsedOrder);
    }
    if (isPageMissing) {
      newParams.set('page', '1');
    }

    // Redirect to the same page but with the corrected query string
    return redirect(`/search?${newParams.toString()}`);
  }
  const trpcSearchAndFilterInput = {
    title: typeof params.title === 'string' ? params.title : undefined,
    year: ensureStringArray(params.year).map(Number),
    format: ensureStringArray(params.format) as ('movie' | 'tv')[],
    origin: ensureStringArray(params.origin),
    genre: ensureStringArray(params.genre).map(Number),
    order: params.order as
      | 'date-desc'
      | 'date-asc'
      | 'title-desc'
      | 'title-asc',
    page: Number(params.page),
  };

  // get results from trpc
  const { pageSize, pageMedia, totalCount } = await api.media.searchAndFilter(
    trpcSearchAndFilterInput
  );
  console.log(`totalCount: ${totalCount}`);

  // prefetch for client cache
  const pageMediaIds = pageMedia.map((m) => m.media.id);
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
        {pageMedia && pageMedia.length > 0 ? (
          <div className="flex flex-col gap-8">
            <MediaList
              viewMode="full"
              mediaList={pageMedia}
              pageMediaIds={uniquePageMediaIds}
            />
            <Pagination
              totalCount={totalCount}
              pageSize={pageSize}
              currentPage={trpcSearchAndFilterInput.page}
            />
          </div>
        ) : (
          <div className="flex h-64 w-full items-center justify-center rounded-lg bg-gray-800">
            <p className="text-gray-400">No results found for your query.</p>
          </div>
        )}
      </HydrateClient>
    </div>
  );
}
