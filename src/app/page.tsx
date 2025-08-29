'use client'; // <-- This page now needs to be a client component for state management

import { useState } from 'react';
import { api } from '~/trpc/react';
import TmdbAdmin from './_components/TmdbAdmin';
import MediaList from './_components/media/MediaList';
import SearchAndFilters from './_components/SearchAndFilters';

// Define a type for your media items based on your schema
type Media = {
  id: string;
  // ... add other properties from your tmdbMedia schema
  title: string;
  description: string | null;
  imageUrl: string | null;
  // etc.
};

// Define the search state type
type SearchState = {
  isActive: boolean;
  params: Parameters<typeof api.media.search.useQuery>[0];
  results: Media[];
};

export default function Home() {
  // State to hold search results and determine if we are in "search mode"
  const [searchState, setSearchState] = useState<SearchState>({
    isActive: false,
    params: { query: '' },
    results: [],
  });

  // Use the tRPC query hook for search. `enabled: false` prevents it from running automatically.
  const { data: searchResults, refetch: executeSearch } =
    api.media.search.useQuery(searchState.params, {
      enabled: false, // We will trigger this manually
      onSuccess: (data) => {
        // Assuming your procedure returns data compatible with the Media type
        setSearchState((prev) => ({ ...prev, results: data as Media[] }));
      },
    });

  // This function is passed to our SearchAndFilters component
  const handleSearch = async (params: SearchState['params']) => {
    setSearchState({
      isActive: true,
      params,
      results: [], // Clear old results while new ones are fetching
    });
    // The `refetch` function from `useQuery` will re-run the query with the latest state
    await executeSearch();
  };

  return (
    // You can remove HydrateClient if you're not prefetching on the server for this page anymore
    <main className="flex flex-col items-center justify-center max-w-6xl mx-auto p-4 gap-8">
      <TmdbAdmin />

      {/* 1. Search and Filters Section */}
      <SearchAndFilters onSearch={handleSearch} />

      {/* 2. Conditional Rendering: Show search results or default lists */}
      {searchState.isActive ? (
        <section className="w-full">
          <h2 className="text-2xl font-bold mb-4">Search Results</h2>
          <MediaList
            // Pass the search results directly to your MediaList component
            initialData={searchState.results}
            // You might need to adjust MediaList to accept `initialData`
            // instead of fetching its own data based on `mediaType`
            viewMode="full" // A grid might be better for search results
          />
        </section>
      ) : (
        <>
          {/* Your original default lists */}
          <MediaList viewMode="preview" mediaType="trending" />
          <MediaList viewMode="preview" mediaType="top mv" />
          <MediaList viewMode="preview" mediaType="top tv" />
        </>
      )}
    </main>
  );
}
