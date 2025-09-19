'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { useDebouncedCallback } from 'use-debounce';
import Cookies from 'js-cookie';

const getCanonicalQueryString = (params: URLSearchParams): string => {
  const sortedParams = new URLSearchParams();
  // Sort keys alphabetically
  const sortedKeys = Array.from(params.keys()).sort();

  sortedKeys.forEach((key) => {
    // Get all values for the key and sort them as well
    const values = params.getAll(key).sort();
    values.forEach((value) => {
      sortedParams.append(key, value);
    });
  });
  return sortedParams.toString();
};

// Define the context type
type FilterContextType = {
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  format: string[];
  setFormat: Dispatch<SetStateAction<string[]>>;
  genre: string[];
  setGenre: Dispatch<SetStateAction<string[]>>;
  origin: string[];
  setOrigin: Dispatch<SetStateAction<string[]>>;
  released: string[];
  setReleased: Dispatch<SetStateAction<string[]>>;
  updated: string[];
  setUpdated: Dispatch<SetStateAction<string[]>>;
  avg: string;
  setAvg: Dispatch<SetStateAction<string>>;
  count: string;
  setCount: Dispatch<SetStateAction<string>>;
  order: string;
  setOrder: Dispatch<SetStateAction<string>>;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [title, setTitle] = useState(searchParams.get('title') ?? '');
  const [format, setFormat] = useState(() => searchParams.getAll('format'));
  const [genre, setGenre] = useState(() => searchParams.getAll('genre'));
  const [origin, setOrigin] = useState(() => searchParams.getAll('origin'));
  const [released, setReleased] = useState(() =>
    searchParams.getAll('released')
  );
  const [updated, setUpdated] = useState(() => searchParams.getAll('updated'));
  const [avg, setAvg] = useState(searchParams.get('avg') ?? '');
  const [count, setCount] = useState(searchParams.get('count') ?? '');
  const [order, setOrder] = useState(searchParams.get('order') ?? '');

  useEffect(() => {
    setTitle(searchParams.get('title') ?? '');
    setFormat(searchParams.getAll('format'));
    setGenre(searchParams.getAll('genre'));
    setOrigin(searchParams.getAll('origin'));
    setReleased(searchParams.getAll('released'));
    setUpdated(searchParams.getAll('updated'));
    setAvg(searchParams.get('avg') ?? '');
    setCount(searchParams.get('count') ?? '');
    setOrder(searchParams.get('order') ?? '');
  }, [searchParams]);

  const updateUrl = useDebouncedCallback((queryString: string) => {
    router.replace(`/search?${queryString}`, { scroll: false });
  }, 500);

  useEffect(() => {
    const newParams = new URLSearchParams();

    if (title) newParams.set('title', title);
    format.forEach((v) => newParams.append('format', v));
    genre.forEach((v) => newParams.append('genre', v));
    origin.forEach((v) => newParams.append('origin', v));
    released.forEach((v) => newParams.append('released', v));
    updated.forEach((v) => newParams.append('updated', v));
    if (avg) newParams.set('avg', avg);
    if (count) newParams.set('count', count);
    if (order) {
      newParams.set('order', order);
      Cookies.set('lastUsedOrder', order, { expires: 7 });
    }

    const oldParams = new URLSearchParams(searchParams.toString());
    oldParams.delete('page');

    if (
      getCanonicalQueryString(newParams) !== getCanonicalQueryString(oldParams)
    ) {
      newParams.set('page', '1');
      updateUrl(getCanonicalQueryString(newParams));
    }
  }, [
    title,
    format,
    genre,
    origin,
    released,
    updated,
    avg,
    count,
    order,
    updateUrl,
    // searchParams,
  ]);

  const value = {
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
  };

  return (
    <FilterContext.Provider value={value}>{children}</FilterContext.Provider>
  );
}

// Custom hook remains the same
export function useFilterContext() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilterContext must be used within a FilterProvider');
  }
  return context;
}
