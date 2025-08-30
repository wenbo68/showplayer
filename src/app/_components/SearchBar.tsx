// ~/app/_components/SearchAndFilters.tsx
'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from 'use-debounce'; // pnpm add use-debounce
import { api } from '~/trpc/react';
// import { type RouterOutputs } from '~/trpc/shared';

// // Helper to get typed genre/origin data
// type FilterOptions = RouterOutputs['media']['getFilterOptions'];

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Fetch genres and origins for dropdowns
  const { data: filterOptions, isLoading } =
    api.media.getFilterOptions.useQuery();

  // Component state for each filter
  const [query, setQuery] = useState(searchParams.get('query') ?? '');
  const [type, setType] = useState(searchParams.get('type') ?? '');
  const [year, setYear] = useState(searchParams.get('year') ?? '');
  const [status, setStatus] = useState(searchParams.get('status') ?? '');
  const [availability, setAvailability] = useState(
    searchParams.get('availability') ?? ''
  );
  // ... add states for genre and origin if using multi-select

  const [debouncedQuery] = useDebounce(query, 500); // Debounce text input

  // This function builds the query string and updates the URL
  const updateUrlParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Set or delete params based on state
    debouncedQuery
      ? params.set('query', debouncedQuery)
      : params.delete('query');
    type ? params.set('type', type) : params.delete('type');
    year ? params.set('year', year) : params.delete('year');
    status ? params.set('status', status) : params.delete('status');
    availability
      ? params.set('availability', availability)
      : params.delete('availability');

    router.push(`${pathname}?${params.toString()}`);
  }, [
    debouncedQuery,
    type,
    year,
    status,
    availability,
    pathname,
    router,
    searchParams,
  ]);

  // Effect to trigger URL update when any filter changes
  useEffect(() => {
    updateUrlParams();
  }, [updateUrlParams]);

  return (
    <div className="w-full bg-gray-800 p-4 rounded-lg flex flex-wrap gap-4 items-center">
      {/* Search Input */}
      <input
        type="text"
        placeholder="Search title..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="bg-gray-700 text-white p-2 rounded flex-grow"
      />
      {/* Media Type Filter */}
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="bg-gray-700 text-white p-2 rounded"
      >
        <option value="">All Types</option>
        <option value="movie">Movies</option>
        <option value="tv">TV Shows</option>
      </select>

      {/* Airing Status Filter */}
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="bg-gray-700 text-white p-2 rounded"
      >
        <option value="">Any Status</option>
        <option value="airing">Airing</option>
        <option value="finished">Finished</option>
        <option value="not_released">Not Released</option>
      </select>

      {/* Availability Filter */}
      <select
        value={availability}
        onChange={(e) => setAvailability(e.target.value)}
        className="bg-gray-700 text-white p-2 rounded"
      >
        <option value="">Any Availability</option>
        <option value="full">Full</option>
        <option value="partial">Partial</option>
        <option value="none">None</option>
      </select>

      {/* You can add more dropdowns for year, genre, origin using the 'filterOptions' data */}
    </div>
  );
}
