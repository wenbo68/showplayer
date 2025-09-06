'use client';

import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { IoSearchSharp } from 'react-icons/io5';
import Filter from './Filter';
import type { FilterOptions } from '~/type';

export default function SearchBar({
  filterOptions,
}: {
  filterOptions: FilterOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPathRef = useRef(pathname);

  // get the initial states from the url
  const [title, setTitle] = useState(searchParams.get('title') ?? '');
  const [format, setFormat] = useState<string[]>(() =>
    searchParams.getAll('format')
  );
  const [genre, setGenre] = useState<number[]>(() =>
    searchParams.getAll('genre').map(Number)
  );
  const [origin, setOrigin] = useState<string[]>(() =>
    searchParams.getAll('origin')
  );
  const [year, setYear] = useState<number[]>(() =>
    searchParams.getAll('year').map(Number)
  );
  const [order, setOrder] = useState(searchParams.get('order') ?? ''); // Add order state

  const [debouncedQuery] = useDebounce(title, 500);

  // when url changes, adjust the states
  useEffect(() => {
    setTitle(searchParams.get('title') ?? '');
    setFormat(searchParams.getAll('format'));
    setGenre(searchParams.getAll('genre').map(Number));
    setOrigin(searchParams.getAll('origin'));
    setYear(searchParams.getAll('year').map(Number));
    setOrder(searchParams.get('order') ?? '');
  }, [searchParams]);

  // whenever the states change, adjust the url
  useEffect(() => {
    // 1. Get the most recent order from sessionStorage, with a fallback default.
    const defaultOrder = sessionStorage.getItem('lastUsedOrder') ?? 'date-desc';

    const params = new URLSearchParams(searchParams.toString());

    // 1. Determine if any filters are active in a single, clear expression.
    const hasFilters =
      debouncedQuery.length > 0 ||
      format.length > 0 ||
      genre.length > 0 ||
      origin.length > 0 ||
      year.length > 0;

    // --- Filter Logic (No changes here) ---
    // Title
    if (debouncedQuery) params.set('title', debouncedQuery);
    else params.delete('title');
    // Filters
    params.delete('format');
    format.forEach((f) => params.append('format', f));
    params.delete('genre');
    genre.forEach((g) => params.append('genre', String(g)));
    params.delete('origin');
    origin.forEach((o) => params.append('origin', o));
    params.delete('year');
    year.forEach((y) => params.append('year', String(y)));

    // --- Updated Order Logic ---
    if (order) {
      // 2. If an order is explicitly set, use it AND save it to sessionStorage for next time.
      params.set('order', order);
      sessionStorage.setItem('lastUsedOrder', order);
    } else if (hasFilters) {
      // 3. If no order is set but other filters are active, apply the saved default.
      params.set('order', defaultOrder);
    } else {
      // 4. If no order and no other params, remove the order parameter.
      params.delete('order');
    }

    const queryString = params.toString();
    if (queryString) {
      router.push(`/search?${queryString}`);
    } else if (pathname === '/search') {
      router.push(initialPathRef.current);
    }
  }, [
    debouncedQuery,
    format,
    genre,
    origin,
    year,
    order,
    router,
    pathname,
    searchParams,
  ]);

  // dropdown options from db
  const formatOptions = [
    { label: 'Movie', trpcInput: 'movie' },
    { label: 'TV', trpcInput: 'tv' },
  ];
  const yearOptions =
    filterOptions.years.map((year) => ({
      trpcInput: year,
      label: String(year),
    })) ?? [];
  const genreOptions =
    filterOptions.genres.map((genre) => ({
      trpcInput: genre.id,
      label: genre.name,
    })) ?? [];
  const originOptions =
    filterOptions.origins.map((origin) => ({
      trpcInput: origin.id,
      label: origin.name,
    })) ?? [];
  const orderOptions = [
    {
      groupLabel: 'Title',
      options: [
        { label: 'A → Z', trpcInput: 'title-asc' },
        { label: 'Z → A', trpcInput: 'title-desc' },
      ],
    },
    {
      groupLabel: 'Release Date',
      options: [
        { label: 'New → Old', trpcInput: 'date-desc' },
        { label: 'Old → New', trpcInput: 'date-asc' },
      ],
    },
  ];

  return (
    <div className="text-sm w-full grid grid-cols-[repeat(auto-fit,minmax(170px,170px))] lg:grid-cols-[repeat(auto-fit,minmax(194px,194px))] justify-center gap-4">
      <div className="w-[170px] lg:w-[194px] flex flex-col gap-3">
        <span className="w-full font-semibold">Title</span>
        <div className="w-full flex bg-gray-800 items-center rounded">
          <div className="p-2">
            <IoSearchSharp size={20} />
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full outline-none"
          />
          <button onClick={() => setTitle('')} className={`p-2 cursor-pointer`}>
            <X size={20} />
          </button>
        </div>
      </div>
      <Filter
        label="Year"
        options={yearOptions}
        state={year}
        setState={(v) => setYear(v as number[])}
        mode="multi"
      />
      <Filter
        label="Format"
        options={formatOptions}
        state={format}
        setState={(v) => setFormat(v as string[])}
        mode="multi"
      />
      <Filter
        label="Origin"
        options={originOptions}
        state={origin}
        setState={(v) => setOrigin(v as string[])}
        mode="multi"
      />
      <Filter
        label="Genre"
        options={genreOptions}
        state={genre}
        setState={(v) => setGenre(v as number[])}
        mode="multi"
      />
      <Filter
        label="Order"
        options={orderOptions}
        state={order}
        setState={(v) => setOrder(v as string)}
        mode="single"
      />
    </div>
  );
}
