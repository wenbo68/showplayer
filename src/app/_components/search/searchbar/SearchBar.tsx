'use client';

import { X } from 'lucide-react';
import { IoSearchSharp } from 'react-icons/io5';
import Filter from './Filter';
import type { FilterOptionsFromDb } from '~/type';
import { IoIosArrowDown } from 'react-icons/io';
import { useSessionStorageState } from '~/app/_hooks/sessionStorageHooks';
import { useFilterContext } from '~/app/_contexts/SearchContext';
import { orderOptions } from '~/constant';

export default function SearchBar({
  filterOptions,
}: {
  filterOptions: FilterOptionsFromDb;
}) {
  const [isFilterVisible, setIsFilterVisible] = useSessionStorageState(
    'isFilterVisible',
    false
  );

  const {
    title,
    setTitle,
    format,
    setFormat,
    genre,
    setGenre,
    origin,
    setOrigin,
    released,
    setReleased,
    updated,
    setUpdated,
    avg,
    setAvg,
    count,
    setCount,
    order,
    setOrder,
  } = useFilterContext();

  // dropdown options for all filters
  const releaseYearOptions =
    filterOptions.releaseYears.map((year) => ({
      trpcInput: String(year),
      label: String(year),
    })) ?? [];
  const updatedYearOptions =
    filterOptions.updatedYears.map((year) => ({
      trpcInput: String(year),
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
      trpcInput: String(genre.id),
      label: genre.name,
    })) ?? [];
  const voteAvgOptions = [
    { label: '> 10%', trpcInput: 1 },
    { label: '> 20%', trpcInput: 2 },
    { label: '> 30%', trpcInput: 3 },
    { label: '> 40%', trpcInput: 4 },
    { label: '> 50%', trpcInput: 5 },
    { label: '> 60%', trpcInput: 6 },
    { label: '> 70%', trpcInput: 7 },
    { label: '> 80%', trpcInput: 8 },
    { label: '> 90%', trpcInput: 9 },
  ].map((o) => {
    return {
      ...o,
      trpcInput: String(o.trpcInput),
    };
  });
  const voteCountOptions = [
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
  ].map((o) => {
    return {
      ...o,
      trpcInput: String(o.trpcInput),
    };
  });

  return (
    <div className="text-sm w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
      <div className="w-full flex flex-col gap-2 col-span-2 sm:col-span-1">
        <span className="w-full font-semibold"> Title</span>
        <div className="w-full flex items-center gap-2">
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
            <button
              onClick={() => setTitle('')}
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
        {/* Filter Components */}
        <div className="contents">
          <Filter
            label="Format"
            options={formatOptions}
            value={format}
            onChange={setFormat}
            mode="multi"
          />
          <Filter
            label="Origin"
            options={originOptions}
            value={origin}
            onChange={setOrigin}
            mode="multi"
          />
          <Filter
            label="Genre"
            options={genreOptions}
            value={genre}
            onChange={setGenre}
            mode="multi"
          />
          <Filter
            label="Release Year"
            options={releaseYearOptions}
            value={released}
            onChange={setReleased}
            mode="multi"
          />
          <Filter
            label="Updated Year"
            options={updatedYearOptions}
            value={updated}
            onChange={setUpdated}
            mode="multi"
          />
          <Filter
            label="Rating Avg"
            options={voteAvgOptions}
            value={avg}
            onChange={setAvg}
            mode="single"
          />
          <Filter
            label="Rating Count"
            options={voteCountOptions}
            value={count}
            onChange={setCount}
            mode="single"
          />
          <Filter
            label="Order"
            options={orderOptions}
            value={order}
            onChange={setOrder}
            mode="single"
          />
        </div>
      </div>
    </div>
  );
}
