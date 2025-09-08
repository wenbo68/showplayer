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
import { auth } from '~/server/auth';

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
  const session = await auth();
  const params = await searchParams;

  // --- 1. Check for missing required parameters ---
  const isOrderMissing = typeof params.order !== 'string';
  const isPageMissing = typeof params.page !== 'string';
  const isCountMissing = typeof params.count !== 'string';

  // --- 2. If any parameter is missing, redirect to a complete URL ---
  if (isOrderMissing || isPageMissing || isCountMissing) {
    // Create a mutable copy of the current params
    const newParams = new URLSearchParams(params as Record<string, string>);

    // Add the defaults if they are missing
    if (isOrderMissing) {
      // 2. get user's last used order from cookie or use default
      const cookieStore = await cookies();
      const lastUsedOrder =
        cookieStore.get('lastUsedOrder')?.value ?? 'popularity-desc';
      newParams.set('order', lastUsedOrder);
    }
    if (isPageMissing) {
      newParams.set('page', '1');
    }
    if (isCountMissing) {
      newParams.set('count', '0');
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
    minVoteCount: Number(params.count),
    order: params.order as
      | 'title-desc'
      | 'title-asc'
      | 'released-desc'
      | 'released-asc'
      | 'updated-desc'
      | 'updated-asc'
      | 'popularity-desc'
      | 'popularity-asc'
      | 'vote-avg-desc'
      | 'vote-avg-asc'
      | 'vote-count-desc'
      | 'vote-count-asc',
    page: Number(params.page),
    list: ensureStringArray(params.list) as ('saved' | 'favorite' | 'later')[],
  };

  // get results from trpc
  const { pageSize, pageMedia, totalCount } = await api.media.searchAndFilter(
    trpcSearchAndFilterInput
  );

  // prefetch for client cache
  const pageMediaIds = pageMedia.map((m) => m.media.id);
  const uniquePageMediaIds = [...new Set(pageMediaIds)];
  api.media.getUserDetailsForMediaList.prefetch({
    mediaIds: uniquePageMediaIds,
  });

  // get filter options from trpc
  const filterOptions = await api.media.getFilterOptions();

  // just use traditional pagination instead of infinite scrolling (harder to use go back/forward in browser)
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
