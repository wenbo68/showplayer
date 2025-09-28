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
  showOrder,
  filterOptions,
}: {
  showOrder: boolean;
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
    genreOp,
    setGenreOp,
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
    avail,
    setAvail,
    order,
    setOrder,
    handleSearch,
  } = useFilterContext();

  // dropdown options for all filters
  const genreOpOptions = [
    { label: 'AND', urlInput: 'and' },
    { label: 'OR', urlInput: 'or' },
  ];
  const releaseYearOptions =
    filterOptions.releaseYears.map((year) => ({
      urlInput: String(year),
      label: String(year),
    })) ?? [];
  const updatedYearOptions =
    filterOptions.updatedYears.map((year) => ({
      urlInput: String(year),
      label: String(year),
    })) ?? [];
  const formatOptions = [
    { label: 'Movie', urlInput: 'movie' },
    { label: 'TV', urlInput: 'tv' },
  ];
  const originOptions =
    filterOptions.origins.map((origin) => ({
      urlInput: origin.id,
      label: origin.name,
    })) ?? [];
  const genreOptions =
    filterOptions.genres.map((genre) => ({
      urlInput: String(genre.id),
      label: genre.name,
    })) ?? [];
  const voteAvgOptions = [
    { label: '> 90%', urlInput: '9' },
    { label: '> 80%', urlInput: '8' },
    { label: '> 70%', urlInput: '7' },
    { label: '> 60%', urlInput: '6' },
    { label: '> 50%', urlInput: '5' },
    { label: '> 40%', urlInput: '4' },
    { label: '> 30%', urlInput: '3' },
    { label: '> 20%', urlInput: '2' },
    { label: '> 10%', urlInput: '1' },
  ];
  const voteCountOptions = [
    { label: '> 500', urlInput: '500' },
    { label: '> 400', urlInput: '400' },
    { label: '> 300', urlInput: '300' },
    { label: '> 200', urlInput: '200' },
    { label: '> 100', urlInput: '100' },
  ];
  const availOptions = [
    { label: '> 100% Ad-Free', urlInput: '100' },
    { label: '> 75% Ad-Free', urlInput: '75' },
    { label: '> 50% Ad-Free', urlInput: '50' },
    { label: '> 25% Ad-Free', urlInput: '25' },
    { label: '> 0% Ad-Free', urlInput: '0' },
    { label: 'Not Released', urlInput: 'no' },
  ];

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="text-sm w-full grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3 md:gap-4 lg:gap-5 xl:gap-6"
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
            // opValue={originOp}
            // opOnChange={setOriginOp}
            // opOptions={opOptions}
          />
          <Filter
            label="Genre Operator"
            options={genreOpOptions}
            value={genreOp}
            onChange={setGenreOp}
            mode="single"
          />
          <Filter
            label="Genre"
            options={genreOptions}
            value={genre}
            onChange={setGenre}
            mode="multi"
            // opValue={genreOp}
            // opOnChange={setGenreOp}
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
          <Filter
            label="Availability"
            options={availOptions}
            value={avail}
            onChange={setAvail}
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
