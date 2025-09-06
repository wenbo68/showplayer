'use client';

import { X } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { IoSearchSharp } from 'react-icons/io5';
import Filter from './Filter';
import type { FilterOptions } from '~/type';
import Cookies from 'js-cookie';

export default function SearchBar({
  filterOptions,
}: {
  filterOptions: FilterOptions;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialPathRef = useRef(pathname);

  const [titleInput, setTitleInput] = useState(searchParams.get('title') ?? '');
  const [debouncedTitle] = useDebounce(titleInput, 500);

  const format = searchParams.getAll('format');
  const genre = searchParams.getAll('genre').map(Number);
  const origin = searchParams.getAll('origin');
  const year = searchParams.getAll('year').map(Number);
  const order = searchParams.get('order') ?? '';

  // if url changes, update title
  useEffect(() => {
    setTitleInput(searchParams.get('title') ?? '');
  }, [searchParams]);

  // if title changes, update url
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedTitle) {
      params.set('title', debouncedTitle);
      params.set('page', '1');
    } else {
      params.delete('title');
    }

    const newQueryString = params.toString();
    const currentQueryString = searchParams.toString();

    if (newQueryString !== currentQueryString) {
      if (newQueryString) {
        router.push(`/search?${newQueryString}`);
      } else if (pathname === '/search') {
        router.push('/');
      }
    }
  }, [debouncedTitle, pathname, router, searchParams]);

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
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            className="w-full outline-none"
          />
          <button
            onClick={() => setTitleInput('')}
            className={`p-2 cursor-pointer`}
          >
            <X size={20} />
          </button>
        </div>
      </div>
      <Filter
        label="Year"
        options={yearOptions}
        valuesFromUrl={year}
        setUrl={(v) => handleMultiFilterChange('year', v as number[])}
        mode="multi"
      />
      <Filter
        label="Format"
        options={formatOptions}
        valuesFromUrl={format}
        setUrl={(v) => handleMultiFilterChange('format', v as string[])}
        mode="multi"
      />
      <Filter
        label="Origin"
        options={originOptions}
        valuesFromUrl={origin}
        setUrl={(v) => handleMultiFilterChange('origin', v as string[])}
        mode="multi"
      />
      <Filter
        label="Genre"
        options={genreOptions}
        valuesFromUrl={genre}
        setUrl={(v) => handleMultiFilterChange('genre', v as number[])}
        mode="multi"
      />
      <Filter
        label="Order"
        options={orderOptions}
        valuesFromUrl={order}
        setUrl={(v) => handleSingleFilterChange('order', v as string)}
        mode="single"
      />
    </div>
  );
}
