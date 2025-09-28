'use client';

import { useSearchParams } from 'next/navigation';
import { api } from '~/trpc/react';
// import type { RouterOutputs } from '~/trpc/shared';
import MediaList from '../media/MediaList';
// import MediaListFallback from '../media/MediaListFallback';
import PageSelector from './PageSelector';
import MediaListFallback from '../media/MediaListFallback';
import { SearchAndFilterInputSchema } from '~/type';
// import { SearchAndFilterInputSchema } from '~/server/api/routers/media';

export default function SearchResults({}) {
  // 1. Get input from url (zod optional doesn't accept null so must use undefined)
  const searchParams = useSearchParams();
  const title = searchParams.get('title') ?? undefined;
  const format = searchParams.getAll('format');
  // const origin = searchParams.getAll('origin');
  // const genre = searchParams.getAll('genre').map(Number);
  const releaseYear = searchParams.getAll('released').map(Number);
  const updatedYear = searchParams.getAll('updated').map(Number);
  const minVoteAvg = Number(searchParams.get('avg')); // '' => 0
  const minVoteCount = Number(searchParams.get('count'));
  const minAvail = searchParams.get('avail') ?? undefined;
  const list = searchParams.getAll('list');
  const order = searchParams.get('order') ?? undefined;
  const page = searchParams.get('page')
    ? Number(searchParams.get('page'))
    : undefined; // must not let it default to 0 when page is empty string

  // ✨ MODIFIED: Get values and operators for genre and origin
  const genreValues = searchParams.getAll('genre').map(Number);
  const originValues = searchParams.getAll('origin');

  // We expect 'and' or 'or'. Default to 'and' as per your schema's new default.
  const genreOp = searchParams.get('genre-op');
  const originOp = searchParams.get('origin-op');

  // 2. Construct the tRPC input object from the context state
  const rawInput = {
    title,
    format,
    // ✨ MODIFIED: Conditionally build the object structure for genre
    genre:
      genreValues.length > 0
        ? {
            values: genreValues,
            operator: genreOp,
            // === 'or' ? 'or' : 'and', // Safely default to 'and'
          }
        : undefined, // Pass undefined if no genres are in the URL
    // ✨ MODIFIED: Conditionally build the object structure for origin
    origin:
      originValues.length > 0
        ? {
            values: originValues,
            operator: originOp,
            // === 'or' ? 'or' : 'and', // Safely default to 'and'
          }
        : undefined, // Pass undefined if no origins are in the URL
    releaseYear,
    updatedYear,
    minVoteAvg,
    minVoteCount,
    minAvail,
    list,
    order,
    page,
    pageSize: 30,
  };

  // 3. Validate the raw input using the shared schema
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
    return (
      <p className="text-gray-300 font-semibold">Invalid search options.</p>
    );
  }

  // 5. Show a skeleton while fetching new data
  if (isFetching) {
    return <MediaListFallback label="SEARCH RESULTS" />;
  }

  // 6. Render the results
  if (data && data.pageMedia.length > 0) {
    const pageMediaIds = data.pageMedia.map((m) => m.media.id);
    const uniquePageMediaIds = [...new Set(pageMediaIds)];

    return (
      <div className="flex flex-col gap-6 sm:gap-7 md:gap-8 lg:gap-9 xl:gap-10">
        <MediaList
          viewMode="full"
          mediaList={data.pageMedia}
          pageMediaIds={uniquePageMediaIds}
          label="SEARCH RESULTS"
        />
        <PageSelector currentPage={page ?? 1} totalPages={data.totalPages} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6">
      <p className="text-gray-300 font-semibold">No results found.</p>
      <p className="text-sm font-semibold">
        Did you know you can add new movies/shows to Showplayer? Just login and
        click your profile!
      </p>
    </div>
  );
}
