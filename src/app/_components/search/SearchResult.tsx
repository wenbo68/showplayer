// ~/app/_components/SearchResults.tsx
import { api } from '~/trpc/server';
import MediaList from '~/app/_components/media/MediaList'; // Reuse your existing MediaList
import type { ListMedia } from '~/type';

interface SearchResultsProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default async function SearchResult({
  searchParams,
}: SearchResultsProps) {
  // Parse searchParams and prepare input for the tRPC procedure
  const input = {
    query:
      typeof searchParams.query === 'string' ? searchParams.query : undefined,
    type:
      searchParams.type === 'movie'
        ? 'movie'
        : searchParams.type === 'tv'
        ? 'tv'
        : (undefined as 'movie' | 'tv' | undefined),
    // year:
    //   typeof searchParams.year === 'string'
    //     ? parseInt(searchParams.year, 10)
    //     : undefined,
    // ... add parsing for other filters like genres, origins etc.
  };

  // const searchResults = await api.media.search(input);
  const searchResults: ListMedia[] = await api.media.searchAndFilter(input);
  // const searchResults: ListMedia[] = [];

  if (searchResults.length === 0) {
    return <p className="text-center">No results found.</p>;
  }

  return <MediaList viewMode="full" mediaList={searchResults} />;
}
