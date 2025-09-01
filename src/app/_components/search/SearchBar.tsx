// ~/components/SearchBar.tsx

'use client';

import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { api } from '~/trpc/react';
import { IoSearchSharp } from 'react-icons/io5';
import Filter from './Filter';

export default function SearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // const initialPathRef = useRef(pathname);

  const { data: filterOptions, isLoading } =
    api.media.getFilterOptions.useQuery();

  // get the initial states from the url
  const [query, setQuery] = useState(searchParams.get('query') ?? '');
  const [types, setTypes] = useState<string[]>(() =>
    searchParams.getAll('types')
  );
  const [genres, setGenres] = useState<number[]>(() =>
    searchParams.getAll('genres').map(Number)
  );
  const [origins, setOrigins] = useState<string[]>(() =>
    searchParams.getAll('origins')
  );
  const [years, setYears] = useState<number[]>(() =>
    searchParams.getAll('years').map(Number)
  );

  const [debouncedQuery] = useDebounce(query, 500);

  // whenever the states change, adjust the url
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedQuery) params.set('query', debouncedQuery);
    types.forEach((type) => params.append('types', type));
    genres.forEach((id) => params.append('genres', String(id)));
    origins.forEach((id) => params.append('origins', id));
    years.forEach((year) => params.append('years', String(year)));
    const queryString = params.toString();
    if (queryString) {
      router.push(`/search?${queryString}`);
    } else if (pathname === '/search') {
      router.push(`/`);
    }
  }, [debouncedQuery, types, genres, origins, years, router, pathname]);

  // dropdown options from db
  const typeOptions = [
    { trpcInput: 'movie', label: 'movie' },
    { trpcInput: 'tv', label: 'tv' },
  ];
  const yearOptions =
    filterOptions?.years.map((year) => ({
      trpcInput: year,
      label: String(year),
    })) ?? [];
  const genreOptions =
    filterOptions?.genres.map((genre) => ({
      trpcInput: genre.id,
      label: genre.name,
    })) ?? [];
  const originOptions =
    filterOptions?.origins.map((origin) => ({
      trpcInput: origin.id,
      label: origin.name,
    })) ?? [];

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

      <Filter
        label="Years"
        options={yearOptions}
        state={years}
        setState={(v) => setYears(v as number[])}
        mode="multi"
        // placeholder="Filter by year..."
      />

      <Filter
        label="Types"
        options={typeOptions}
        state={types}
        setState={(v) => setTypes(v as string[])}
        mode="multi"
      />

      <Filter
        label="Origins"
        options={originOptions}
        state={origins}
        setState={(v) => setOrigins(v as string[])}
        mode="multi"
        // placeholder="Filter by origin..."
      />

      <Filter
        label="Genres"
        options={genreOptions}
        state={genres}
        setState={(v) => setGenres(v as number[])}
        mode="multi"
        // placeholder="Filter by genre..."
      />
    </div>
  );
}
