'use client';

import { X } from 'lucide-react';
import { IoSearchSharp } from 'react-icons/io5';
import Filter from './Filter';
import type { FilterOptionsFromDb } from '~/type';
import { IoIosArrowDown } from 'react-icons/io';
import { useSessionStorageState } from '~/app/_hooks/sessionStorageHooks';
import { useFilterContext } from '~/app/_contexts/SearchContext';
import { orderOptions } from '~/constant';
import { MdKeyboardReturn } from 'react-icons/md';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

export default function SearchBar({
  showOrder,
  filterOptions,
}: {
  showOrder: boolean;
  filterOptions: FilterOptionsFromDb;
}) {
  const searchParams = useSearchParams();

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
    handleSearch,
    genreOperator,
    setGenreOperator,
    // originOperator,
    // setOriginOperator,
  } = useFilterContext();

  // below code will automatically push you to search page from home page
  // not when you 1st land on home but if you go back to home a/f visiting other pages
  // just use handleSubmit with future state as input

  // const isInitialMount = useRef(true);
  // // This useEffect hook *reacts* to the state change.
  // useEffect(() => {
  //   // Skip the first render
  //   if (isInitialMount.current) {
  //     isInitialMount.current = false;
  //     return;
  //   }
  //   // By the time this code runs, the 'title' variable is guaranteed to be
  //   // the new, updated value. Now it's safe to call the debounced search.
  //   debouncedSearch();
  // }, [title, debouncedSearch]); // This effect depends on 'title'

  // // Create a debounced version of the search handler
  // const debouncedTitleSearch = useDebouncedCallback((newTitle: string) => {
  //   handleSearch({ title: newTitle });
  // }, 300);

  // dropdown options for all filters
  const opOptions = [
    { label: 'AND', trpcInput: 'and' },
    { label: 'OR', trpcInput: 'or' },
  ];
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

  // const submitCountRef = useRef(0);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // submitCountRef.current += 1;
    // console.log('Submit count:', submitCountRef.current);

    handleSearch();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="text-sm w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2"
    >
      <div className="w-full flex flex-col gap-2 col-span-2 sm:col-span-1">
        <span className="w-full font-semibold">Title</span>
        <div className="w-full flex items-center gap-2">
          <div className="w-full flex bg-gray-800 items-center rounded">
            <div className="p-2">
              <IoSearchSharp size={20} />
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleSearch({ title: e.target.value });
              }}
              // onBlur={(e) => {
              //   // don't trigger onSubmit bc we are already calling handleSearch here
              //   e.preventDefault();
              //   setTitle(e.target.value);
              //   handleSearch({ title: e.target.value });
              // }}
              className="w-full outline-none"
            />
            <button
              onClick={() => {
                setTitle('');
              }}
              className={`p-2 cursor-pointer`}
            >
              <X size={20} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="sm:hidden rounded bg-gray-800 p-2 cursor-pointer"
          >
            <IoIosArrowDown size={20} />
          </button>
          {/* <button
            type="submit"
            onClick={() => setIsFilterVisible(!isFilterVisible)}
            className="sm:hidden rounded text-gray-300 bg-blue-600 hover:bg-blue-500 p-2 cursor-pointer"
          >
            <MdKeyboardReturn size={20} />
          </button> */}
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
            // opValue={originOperator}
            // opOnChange={setOriginOperator}
            // opOptions={opOptions}
          />
          <Filter
            label="Genre Operator"
            options={opOptions}
            value={genreOperator}
            onChange={setGenreOperator}
            mode="single"
          />
          <Filter
            label="Genre"
            options={genreOptions}
            value={genre}
            onChange={setGenre}
            mode="multi"
            // opValue={genreOperator}
            // opOnChange={setGenreOperator}
            // opOptions={opOptions}
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
          {showOrder && (
            <Filter
              label="Order"
              options={orderOptions}
              value={order}
              onChange={setOrder}
              mode="single"
            />
          )}
        </div>
      </div>

      {/* <div className="w-full flex-col gap-2 hidden sm:flex">
        <span className="w-full font-semibold"> Search</span>
        <button
          type="submit"
          onClick={(e) => handleSearch()}
          className="flex items-center gap-2 py-2 cursor-pointer bg-blue-600 text-gray-300 rounded hover:bg-blue-500 transition-colors"
        >
          <span className="w-full text-start pl-3 ">Click!</span>
          <div className="flex items-center justify-center px-2">
            <MdKeyboardReturn size={20} />
          </div>
        </button>
      </div> */}
    </form>
  );
}
