'use client';

import { useSearchParams } from 'next/navigation';
import { useFilterContext } from '~/app/_contexts/SearchContext';
import { api } from '~/trpc/react';
// import type { RouterOutputs } from '~/trpc/shared';
import MediaList from '../media/MediaList';
// import MediaListFallback from '../media/MediaListFallback';
import PageSelector from './PageSelector';
import MediaListFallback from '../media/MediaListFallback';
import type { UserList } from '~/server/db/schema';
import type { ListMedia, Order } from '~/type';

// Helper function to ensure a value is an array of strings
const ensureStringArray = (value: string | string[]): string[] => {
  if (Array.isArray(value)) return value;
  return [value];
};

// type InitialData = RouterOutputs['media']['searchAndFilter'];

export default function MediaResults({
  initialData,
}: {
  initialData: {
    pageMedia: ListMedia[];
    totalPages: number;
  };
}) {
  // 1. Get filter state from context and page from URL
  const filters = useFilterContext();
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');

  // 2. Construct the tRPC input object from the context state
  const trpcInput = {
    page: page,
    title: filters.title || undefined,
    format: filters.format as ('movie' | 'tv')[],
    origin: filters.origin,
    genre: filters.genre.map(Number),
    releaseYear: filters.released.map(Number),
    updatedYear: filters.updated.map(Number),
    minVoteAvg: filters.avg ? Number(filters.avg) : undefined,
    minVoteCount: filters.count ? Number(filters.count) : undefined,
    order: (filters.order as Order) ?? 'popularity-desc',
    pageSize: 30,
    list: ensureStringArray(searchParams.getAll('list')) as UserList[],
  };

  // 3. Use the `useQuery` hook to fetch data
  const { data, isFetching } = api.media.searchAndFilter.useQuery(trpcInput, {
    // Use the server-fetched data for the very first load
    // placeholderData: initialData,
  });

  // 4. Show a skeleton while fetching new data
  if (isFetching) {
    return <MediaListFallback />;
  }

  // 5. Render the results
  if (data && data.pageMedia.length > 0) {
    const pageMediaIds = data.pageMedia.map((m) => m.media.id);
    const uniquePageMediaIds = [...new Set(pageMediaIds)];

    return (
      <div className="flex flex-col gap-6">
        <MediaList
          viewMode="full"
          mediaList={data.pageMedia}
          pageMediaIds={uniquePageMediaIds}
        />
        <PageSelector
          currentPage={trpcInput.page}
          totalPages={data.totalPages}
        />
      </div>
    );
  }

  return (
    <div className="text-center py-10">
      <p>No results found.</p>
    </div>
  );
}
