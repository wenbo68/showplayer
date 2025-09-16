'use client';

import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { IoSearchSharp } from 'react-icons/io5';
import Filter from './Filter';
import type { FilterOptions } from '~/type';
import Cookies from 'js-cookie';
import { IoIosArrowDown } from 'react-icons/io';
import { useSessionStorage } from '~/app/_hooks/sessionStorageHooks';

export default function SearchBar({
  filterOptions,
}: {
  filterOptions: FilterOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPathRef = useRef(pathname);

  // 2. State for filter visibility, persisted in sessionStorage
  const [isFilterVisible, setIsFilterVisible] = useSessionStorage(
    'isFilterVisible',
    false
  );

  // 1. State is now only for the IMMEDIATE visual value of the input
  const [titleInput, setTitleInput] = useState(searchParams.get('title') ?? '');

  // 2. useEffect to sync URL changes TO the input (e.g., from ActiveFilters or back/forward)
  useEffect(() => {
    setTitleInput(searchParams.get('title') ?? '');
  }, [searchParams]);

  // 3. Create a debounced function to update the URL
  const debouncedUpdate = useDebouncedCallback((newTitle: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newTitle) {
      params.set('title', newTitle);
    } else {
      params.delete('title');
    }
    params.set('page', '1');
    router.push(`/search?${params.toString()}`);
  }, 500); // 500ms delay

  const releaseYear = searchParams.getAll('released').map(Number);
  const updatedYear = searchParams.getAll('updated').map(Number);
  const format = searchParams.getAll('format');
  const origin = searchParams.getAll('origin');
  const genre = searchParams.getAll('genre').map(Number);
  const avg = searchParams.get('avg') ?? '';
  const count = searchParams.get('count') ?? '';
  const order = searchParams.get('order') ?? '';

  // update url when selected filter options change
  // useCallback to prevent the 2 functions from being recreated when SearchBar rerenders (unless the dependencies change)
  // if the 2 functions are recreated, the Filter will rerender b/c it use the function as props
  const handleMultiFilterChange = useCallback(
    (key: string, values: (string | number)[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      values.forEach((value) => params.append(key, String(value)));

      params.set('page', '1');

      const queryString = params.toString();
      if (queryString) {
        router.push(`/search?${queryString}`);
      } else if (pathname === '/search') {
        router.push(initialPathRef.current);
      }
    },
    [pathname, router, initialPathRef, searchParams]
  );

  const handleSingleFilterChange = useCallback(
    (key: string, value: string | number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, String(value));
        // if user sets the order, put that order in cookie for 7 days
        if (key === 'order') {
          sessionStorage.setItem('lastUsedOrder', String(value));
          Cookies.set('lastUsedOrder', String(value), { expires: 7 });
        }
      } else {
        params.delete(key);
      }

      params.set('page', '1');

      const queryString = params.toString();
      if (queryString) {
        router.push(`/search?${queryString}`);
      } else if (pathname === '/search') {
        router.push(initialPathRef.current);
      }
    },
    [pathname, router, initialPathRef, searchParams]
  );

  // dropdown options from db
  const releaseYearOptions =
    filterOptions.releaseYears.map((year) => ({
      trpcInput: year,
      label: String(year),
    })) ?? [];
  const updatedYearOptions =
    filterOptions.updatedYears.map((year) => ({
      trpcInput: year,
      label: String(year),
    })) ?? [];
  const formatOptions = [
    { label: 'Movie', trpcInput: 'movie' },
    { label: 'TV', trpcInput: 'tv' },
  ];
  const originOptions =
    filterOptions.origins.map((origin) => ({
      trpcInput: origin.id,
      label: origin.name,
    })) ?? [];
  const genreOptions =
    filterOptions.genres.map((genre) => ({
      trpcInput: genre.id,
      label: genre.name,
    })) ?? [];
  const voteAvgOptions = [
    // { label: '0+', trpcInput: 0 },
    { label: '> 10%', trpcInput: 1 },
    { label: '> 20%', trpcInput: 2 },
    { label: '> 30%', trpcInput: 3 },
    { label: '> 40%', trpcInput: 4 },
    { label: '> 50%', trpcInput: 5 },
    { label: '> 60%', trpcInput: 6 },
    { label: '> 70%', trpcInput: 7 },
    { label: '> 80%', trpcInput: 8 },
    { label: '> 90%', trpcInput: 9 },
  ];
  const voteCountOptions = [
    // { label: '0+', trpcInput: 0 },
    { label: '> 100', trpcInput: 100 },
    { label: '> 200', trpcInput: 200 },
    { label: '> 300', trpcInput: 300 },
    { label: '> 400', trpcInput: 400 },
    { label: '> 500', trpcInput: 500 },
    // { label: '> 600', trpcInput: 600 },
    // { label: '> 700', trpcInput: 700 },
    // { label: '> 800', trpcInput: 800 },
    // { label: '> 900', trpcInput: 900 },
    // { label: '> 1000', trpcInput: 1000 },
  ];
  const orderOptions = [
    {
      groupLabel: 'Popularity',
      options: [
        { label: 'Most → Least', trpcInput: 'popularity-desc' },
        { label: 'Least → Most', trpcInput: 'popularity-asc' },
      ],
    },
    {
      groupLabel: 'Rating Avg',
      options: [
        { label: 'High → Low', trpcInput: 'vote-avg-desc' },
        { label: 'Low → High', trpcInput: 'vote-avg-asc' },
      ],
    },
    {
      groupLabel: 'Rating Count',
      options: [
        { label: 'Most → Fewest', trpcInput: 'vote-count-desc' },
        { label: 'Fewest → Most', trpcInput: 'vote-count-asc' },
      ],
    },
    {
      groupLabel: 'Release Date',
      options: [
        { label: 'New → Old', trpcInput: 'released-desc' },
        { label: 'Old → New', trpcInput: 'released-asc' },
      ],
    },
    {
      groupLabel: 'Updated Date',
      options: [
        { label: 'Recent → Old', trpcInput: 'updated-desc' },
        { label: 'Old → Recent', trpcInput: 'updated-asc' },
      ],
    },
    {
      groupLabel: 'Title',
      options: [
        { label: 'A → Z', trpcInput: 'title-asc' },
        { label: 'Z → A', trpcInput: 'title-desc' },
      ],
    },
  ];

  return (
    <div className="text-sm w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      <div className="w-full flex flex-col gap-3 col-span-2 sm:col-span-1">
        <span className="w-full font-semibold"> Title</span>
        <div className="w-full flex items-center gap-4">
          <div className="w-full flex bg-gray-800 items-center rounded">
            <div className="p-2">
              <IoSearchSharp size={20} />
            </div>
            <input
              type="text"
              value={titleInput}
              // 4. The input's onChange now updates the local state AND calls the debounced function
              onChange={(e) => {
                setTitleInput(e.target.value);
                debouncedUpdate(e.target.value);
              }}
              className="w-full outline-none"
            />
            <button
              onClick={() => {
                setTitleInput('');
                debouncedUpdate('');
              }}
              className={`p-2 cursor-pointer`}
            >
              <X size={20} />
            </button>
          </div>
          <button
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="sm:hidden rounded bg-gray-800 p-2 cursor-pointer"
          >
            <IoIosArrowDown size={20} />
          </button>
        </div>
      </div>

      {/* 4. Conditionally apply classes to a wrapper around the filters */}
      <div className={`${isFilterVisible ? 'contents' : 'hidden'} sm:contents`}>
        <Filter
          label="Format"
          options={formatOptions}
          urlValues={format}
          setUrlValues={(v) => handleMultiFilterChange('format', v as string[])}
          mode="multi"
        />
        <Filter
          label="Origin"
          options={originOptions}
          urlValues={origin}
          setUrlValues={(v) => handleMultiFilterChange('origin', v as string[])}
          mode="multi"
        />
        <Filter
          label="Genre"
          options={genreOptions}
          urlValues={genre}
          setUrlValues={(v) => handleMultiFilterChange('genre', v as number[])}
          mode="multi"
        />

        <Filter
          label="Release Year"
          options={releaseYearOptions}
          urlValues={releaseYear}
          setUrlValues={(v) =>
            handleMultiFilterChange('released', v as number[])
          }
          mode="multi"
        />
        <Filter
          label="Updated Year"
          options={updatedYearOptions}
          urlValues={updatedYear}
          setUrlValues={(v) =>
            handleMultiFilterChange('updated', v as number[])
          }
          mode="multi"
        />
        <Filter
          label="Rating Avg"
          options={voteAvgOptions}
          urlValues={avg}
          setUrlValues={(v) => handleSingleFilterChange('avg', v as string)}
          mode="single"
        />
        <Filter
          label="Rating Count"
          options={voteCountOptions}
          urlValues={count}
          setUrlValues={(v) => handleSingleFilterChange('count', v as string)}
          mode="single"
        />
        <Filter
          label="Order"
          options={orderOptions}
          urlValues={order}
          setUrlValues={(v) => handleSingleFilterChange('order', v as string)}
          mode="single"
        />
      </div>
    </div>
  );
}
