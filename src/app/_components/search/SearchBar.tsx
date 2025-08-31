// ~/components/SearchBar.tsx

'use client';

import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { api } from '~/trpc/react';
import { IoSearchSharp } from 'react-icons/io5';
import Filter from './Filter'; // <-- Import the new component

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPathRef = useRef(pathname);

  const { data: filterOptions, isLoading } =
    api.media.getFilterOptions.useQuery();

  const [query, setQuery] = useState(searchParams.get('query') ?? '');
  const [types, setTypes] = useState<string[]>(() =>
    searchParams.getAll('type')
  );
  const [selectedGenres, setSelectedGenres] = useState<number[]>(() =>
    searchParams.getAll('genres').map(Number)
  );
  const [selectedOrigins, setSelectedOrigins] = useState<string[]>(() =>
    searchParams.getAll('origins')
  );
  const [selectedYears, setSelectedYears] = useState<number[]>(() =>
    searchParams.getAll('years').map(Number)
  );

  const [debouncedQuery] = useDebounce(query, 500);

  // Navigation logic remains the same
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('query', debouncedQuery);
    // if (types) params.set('type', types);
    types.forEach((type) => params.append('types', type));
    selectedGenres.forEach((id) => params.append('genres', String(id)));
    selectedOrigins.forEach((id) => params.append('origins', id));
    selectedYears.forEach((year) => params.append('years', String(year)));
    const queryString = params.toString();
    if (queryString) {
      router.push(`/search?${queryString}`);
    } else if (pathname === '/search') {
      router.push(initialPathRef.current);
    }
  }, [
    debouncedQuery,
    types,
    selectedGenres,
    selectedOrigins,
    selectedYears,
    router,
    pathname,
  ]);

  // Prepare options for the dropdown components
  const typeOptions = [
    { value: 'movie', label: 'movie' },
    { value: 'tv', label: 'tv' },
  ];
  const yearOptions =
    filterOptions?.years.map((y) => ({ value: y, label: String(y) })) ?? [];
  const genreOptions =
    filterOptions?.genres.map((g) => ({ value: g.id, label: g.name })) ?? [];
  const originOptions =
    filterOptions?.origins.map((o) => ({ value: o.id, label: o.name })) ?? [];

  return (
    <div className="w-full flex gap-4 flex-auto text-sm text-gray-400">
      <div className="w-full flex flex-col gap-3">
        <span className="font-semibold">Search</span>
        <div className="w-full relative">
          <IoSearchSharp
            className="absolute left-2 top-1/2 -translate-y-1/2"
            size={20}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full py-2 pl-9 bg-gray-800 rounded outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Use the new reusable component for all filters */}
      <Filter
        label="Types"
        options={typeOptions}
        value={types}
        onChange={(v) => setTypes(v as string[])}
        mode="multi"
      />

      <Filter
        label="Years"
        options={yearOptions}
        value={selectedYears}
        onChange={(v) => setSelectedYears(v as number[])}
        mode="multi"
        // placeholder="Filter by year..."
      />

      <Filter
        label="Genres"
        options={genreOptions}
        value={selectedGenres}
        onChange={(v) => setSelectedGenres(v as number[])}
        mode="multi"
        // placeholder="Filter by genre..."
      />

      <Filter
        label="Origins"
        options={originOptions}
        value={selectedOrigins}
        onChange={(v) => setSelectedOrigins(v as string[])}
        mode="multi"
        // placeholder="Filter by origin..."
      />
    </div>
  );
}
