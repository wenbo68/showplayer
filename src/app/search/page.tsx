// ~/app/search/page.tsx

import { api, HydrateClient } from '~/trpc/server';
import SearchBar from '../_components/search/searchbar/SearchBar';
import MediaList from '../_components/media/MediaList';
import { Suspense } from 'react';
import SearchBarFallback from '../_components/search/searchbar/SearchBarFallback';
import ActiveLabels from '../_components/search/label/ActiveLabels';
import PageSelector from '../_components/search/PageSelector';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { auth } from '~/server/auth';
import ActiveLabelsFallback from '../_components/search/label/ActiveLabelsFallback';
import { FilterProvider } from '../_contexts/SearchContext';

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

  // --- 2. If any parameter is missing, redirect to a complete URL ---
  if (isOrderMissing || isPageMissing) {
    // Create a mutable copy of the current params
    const newParams = new URLSearchParams(params as Record<string, string>);

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

    // Redirect to the same page but with the corrected query string
    return redirect(`/search?${newParams.toString()}`);
  }

  const trpcSearchAndFilterInput = {
    title: typeof params.title === 'string' ? params.title : undefined,
    releaseYear: ensureStringArray(params.released).map(Number),
    updatedYear: ensureStringArray(params.updated).map(Number),
    format: ensureStringArray(params.format) as ('movie' | 'tv')[],
    origin: ensureStringArray(params.origin),
    genre: ensureStringArray(params.genre).map(Number),
    minVoteAvg: typeof params.avg === 'string' ? Number(params.avg) : undefined,
    minVoteCount:
      typeof params.count === 'string' ? Number(params.count) : undefined,
    order: params.order as
      | 'popularity-desc'
      | 'popularity-asc'
      | 'vote-avg-desc'
      | 'vote-avg-asc'
      | 'vote-count-desc'
      | 'vote-count-asc'
      | 'released-desc'
      | 'released-asc'
      | 'updated-desc'
      | 'updated-asc'
      | 'title-desc'
      | 'title-asc',
    page: Number(params.page),
    pageSize: 30,
    list: ensureStringArray(params.list) as ('saved' | 'favorite' | 'later')[],
  };

  // get results from trpc
  const { pageMedia, totalPages } = await api.media.searchAndFilter(
    trpcSearchAndFilterInput
  );

  // prefetch for client cache
  const pageMediaIds = pageMedia.map((m) => m.media.id);
  const uniquePageMediaIds = [...new Set(pageMediaIds)];
  api.user.getUserDetailsForMediaList.prefetch({
    mediaIds: uniquePageMediaIds,
  });

  // get filter options from trpc
  const filterOptions = await api.media.getFilterOptions();

  // just use traditional pagination instead of infinite scrolling (harder to use go back/forward in browser)
  return (
    <div className="flex flex-col gap-8">
      <FilterProvider>
        <Suspense fallback={<SearchBarFallback />}>
          <SearchBar filterOptions={filterOptions} />
        </Suspense>

        <div className="w-full flex justify-between gap-4">
          <Suspense fallback={<ActiveLabelsFallback />}>
            <ActiveLabels filterOptions={filterOptions} />
          </Suspense>
        </div>
      </FilterProvider>

      {pageMedia.length > 0 && (
        <HydrateClient>
          <div className="flex flex-col gap-6">
            <MediaList
              viewMode="full"
              mediaList={pageMedia}
              pageMediaIds={uniquePageMediaIds}
            />
            <PageSelector
              currentPage={trpcSearchAndFilterInput.page}
              totalPages={totalPages}
            />
          </div>
        </HydrateClient>
      )}
    </div>
  );
}
