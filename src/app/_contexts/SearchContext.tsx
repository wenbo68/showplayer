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

// This is now the one and only provider you export
export function FilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // State initialization remains the same
  const [title, setTitle] = useState(searchParams.get('title') ?? '');
  const [format, setFormat] = useState(() => searchParams.getAll('format'));
  // ✨ FIX: All state should be string arrays to match URL params directly
  const [genre, setGenre] = useState(() => searchParams.getAll('genre'));
  const [origin, setOrigin] = useState(() => searchParams.getAll('origin'));
  const [released, setReleased] = useState(() =>
    searchParams.getAll('released')
  );
  const [updated, setUpdated] = useState(() => searchParams.getAll('updated'));
  const [avg, setAvg] = useState(searchParams.get('avg') ?? '');
  const [count, setCount] = useState(searchParams.get('count') ?? '');
  const [order, setOrder] = useState(searchParams.get('order') ?? '');

  // Effect to sync URL to state remains the same
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
    router.push(`/search?${queryString}`);
  }, 500);

  // Effect to sync state to URL remains the same
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

    if (newParams.toString() !== oldParams.toString()) {
      newParams.set('page', '1');
      updateUrl(newParams.toString());
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
    searchParams, // Add searchParams back to avoid stale closure issues
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
