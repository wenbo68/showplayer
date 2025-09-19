'use client';

import { useSearchParams } from 'next/navigation';
import { useFilterContext } from '~/app/_contexts/SearchContext';
import { api } from '~/trpc/react';
// import type { RouterOutputs } from '~/trpc/shared';
import MediaList from '../media/MediaList';
// import MediaListFallback from '../media/MediaListFallback';
import PageSelector from './PageSelector';
import MediaListFallback from '../media/MediaListFallback';
import type { MediaType, UserList } from '~/server/db/schema';
import { SearchAndFilterInputSchema, type ListMedia, type Order } from '~/type';
// import { SearchAndFilterInputSchema } from '~/server/api/routers/media';

// Helper function to ensure a value is an array of strings
const ensureStringArray = (value: string | string[]): string[] => {
  if (Array.isArray(value)) return value;
  return [value];
};

// type InitialData = RouterOutputs['media']['searchAndFilter'];

export default function MediaResults(
  {
    //   initialData,
    // }: {
    //   initialData: {
    //     pageMedia: ListMedia[];
    //     totalPages: number;
    //   };
  }
) {
  // 1. Get filter states
  const filters = useFilterContext();

  // 2. Get list and page from url
  const searchParams = useSearchParams();
  const list = searchParams.getAll('list');
  const page = searchParams.get('page')
    ? Number(searchParams.get('page'))
    : undefined;

  // 2. Construct the tRPC input object from the context state
  const rawInput = {
    title: filters.title || undefined,
    format: filters.format,
    origin: filters.origin,
    genre: filters.genre.map(Number),
    releaseYear: filters.released.map(Number),
    updatedYear: filters.updated.map(Number),
    minVoteAvg: filters.avg ? Number(filters.avg) : undefined,
    minVoteCount: filters.count ? Number(filters.count) : undefined,
    order: filters.order || undefined,
    list: list,
    page: page,
    pageSize: 30,
  };

  // ✨ 3. Validate the raw input using the shared schema
  const parsedInput = SearchAndFilterInputSchema.safeParse(rawInput);

  // 4. Use the `useQuery` hook, but only enable it if parsing succeeded
  const { data, isFetching } = api.media.searchAndFilter.useQuery(
    parsedInput.success ? parsedInput.data : (undefined as any),
    {
      enabled: parsedInput.success,
      staleTime: 0, // always refetch immediately on input change
    }
  );

  if (!parsedInput.success) {
    // You can optionally render an error state if the filters are somehow invalid
    console.error('Zod validation failed:', parsedInput.error);
    return <div>Invalid filter options.</div>;
  }

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
        <PageSelector currentPage={page ?? 1} totalPages={data.totalPages} />
      </div>
    );
  }

  return (
    <div className="text-center py-10">
      <p>No results found.</p>
    </div>
  );
}
