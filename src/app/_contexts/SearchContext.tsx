'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  type Dispatch,
  type SetStateAction,
  useRef,
} from 'react';
// import { useDebouncedCallback } from 'use-debounce';
// import Cookies from 'js-cookie';
import { useSessionStorageState } from '../_hooks/sessionStorageHooks';

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
  handleSearch: (
    overrides?: Partial<{
      title: string;
      format: string[];
      genre: string[];
      origin: string[];
      released: string[];
      updated: string[];
      avg: string;
      count: string;
      order: string;
    }>
  ) => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export function FilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // // ✨ 2. Create a ref to flag when an update is in progress
  // const isUpdatingUrlFromState = useRef(false);

  // const isSearchPage = pathname === '/search';

  // 1. use states for instant highlight on selected filter options
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
  // actually we don't need a default anymore because every search will set this with a default
  const [order, setOrder] = useSessionStorageState('order', '');

  // const [list, setList] = useState(searchParams.getAll('list') ?? '');
  // const [page, setPage] = useState(searchParams.get('page') ?? '');

  // ✨ 2. Add a ref to track the initial mount
  const isInitialMount = useRef(true);

  // 2. sync url to state
  useEffect(() => {
    // // ✨ 3. Check the flag. If true, it means the state is the source of truth, so we ignore the URL change.
    // if (isUpdatingUrlFromState.current) {
    //   // Reset the flag for the next potential manual navigation
    //   isUpdatingUrlFromState.current = false;
    //   return;
    // }

    // This code now only runs on initial load or manual browser navigation (back/forward)
    setTitle(searchParams.get('title') ?? '');
    setFormat(searchParams.getAll('format'));
    setGenre(searchParams.getAll('genre'));
    setOrigin(searchParams.getAll('origin'));
    setReleased(searchParams.getAll('released'));
    setUpdated(searchParams.getAll('updated'));
    setAvg(searchParams.get('avg') ?? '');
    setCount(searchParams.get('count') ?? '');
    setOrder(searchParams.get('order') ?? '');
    // // Add the conditional logic for the 'order' state
    // const urlOrder = searchParams.get('order');
    // if (urlOrder) {
    //   // If the URL has an order, use it.
    //   setOrder(urlOrder);
    // } else if (pathname === '/search') {
    //   // If there's NO order in the URL AND we are on the search page, set the default.
    //   setOrder('popularity-desc');
    // } else {
    //   // Otherwise (e.g., on the homepage), keep it empty.
    //   setOrder('');
    // }
  }, [searchParams]);

  // // 3. what is useDebouncedCallback?
  // // each time the function is called, its execution is delayed by set amount of time
  // // if function called again within this delay, delay timer resets
  // // at the end of timer, only the latest call is executed
  // const updateUrl = useDebouncedCallback((queryString: string) => {
  //   // use replace instead of push and set scroll to false (so that you aren't forced back to top of page)
  //   // push will put all urls in history
  //   // replace will replace the latest url in history (will not clutter history)
  //   router.replace(`/search?${queryString}`, { scroll: false });
  // }, 500);

  // // 4. sync state to url
  // // done only when new url would be different from old url
  // // otherwise search page will rerender bc this useEffect will be called again after the above useEffect changes state during its 1st run
  // useEffect(() => {
  //   // Determine if any filter is active. This signals an intent to search.
  //   const isSearching =
  //     title ||
  //     format.length > 0 ||
  //     genre.length > 0 ||
  //     origin.length > 0 ||
  //     released.length > 0 ||
  //     updated.length > 0 ||
  //     avg ||
  //     count;

  //   // Don't do anything if no filters are selected and we are not on the search page.
  //   // This prevents adding default params to the URL from the homepage.
  //   if (!isSearching && pathname !== '/search') {
  //     return;
  //   }
  //   const newParams = new URLSearchParams();

  //   if (title) newParams.set('title', title);
  //   format.forEach((v) => newParams.append('format', v));
  //   genre.forEach((v) => newParams.append('genre', v));
  //   origin.forEach((v) => newParams.append('origin', v));
  //   released.forEach((v) => newParams.append('released', v));
  //   updated.forEach((v) => newParams.append('updated', v));
  //   if (avg) newParams.set('avg', avg);
  //   if (count) newParams.set('count', count);

  //   // cannot use setOrder here bc that would trigger another call of this useEffect as order is in the dep arr
  //   // however, if we don't set the order here, a change in other filters at home page will create a url with order
  //   // and trigger trpc search with the current states in SearchResult component.
  //   // this may happen before the useEffect to sync url to states, meaning that the trpc search uses order = ''
  //   // to resolve this issue, we have to delegate this issue and address at the point of impact instead of fixing it at the src here
  //   if (order) {
  //     newParams.set('order', order);
  //     // Cookies.set('lastUsedOrder', order, { expires: 7 });
  //   } else if (isSearching) {
  //     newParams.set('order', 'popularity-desc');
  //   }

  //   const oldParams = new URLSearchParams(searchParams.toString());
  //   oldParams.delete('page');

  //   if (newParams.toString() !== oldParams.toString()) {
  //     newParams.set('page', '1');
  //     // ✨ 4. Set the flag right BEFORE we trigger the navigation
  //     isUpdatingUrlFromState.current = true;
  //     router.replace(`/search?${newParams.toString()}`, { scroll: false });
  //   }
  // }, [
  //   title,
  //   format,
  //   genre,
  //   origin,
  //   released,
  //   updated,
  //   avg,
  //   count,
  //   order,
  //   // updateUrl,
  //   pathname,
  // ]);
  // // normally you include all used variables in dependency array
  // // but there are exceptions:
  // // 1. unstable obj: even if obj value didn't change, the obj is considered changed; eg searchParams, router, etc.
  // // 2. obj that never changes: ref
  // // 3. global singletons: window, document, localStorage, etc.
  // // ...

  // // ✨ 2. Create the function that will be called by the search button
  // const handleSearch = () => {
  //   const newParams = new URLSearchParams();

  //   // Build the query string from the current state
  //   if (title) newParams.set('title', title);
  //   format.forEach((v) => newParams.append('format', v));
  //   genre.forEach((v) => newParams.append('genre', v));
  //   origin.forEach((v) => newParams.append('origin', v));
  //   released.forEach((v) => newParams.append('released', v));
  //   updated.forEach((v) => newParams.append('updated', v));
  //   if (avg) newParams.set('avg', avg);
  //   if (count) newParams.set('count', count);
  //   if (order) {
  //     newParams.set('order', order);
  //   } else {
  //     setOrder('popularity-desc');
  //     newParams.set('order', 'popularity-desc');
  //   }

  //   // Always reset to page 1 for a new search
  //   newParams.set('page', '1');

  //   // Navigate to the search page with the new params
  //   router.push(`/search?${newParams.toString()}`);
  // };

  type SearchParamsOverride = Partial<{
    title: string;
    format: string[];
    genre: string[];
    origin: string[];
    released: string[];
    updated: string[];
    avg: string;
    count: string;
    order: string;
  }>;

  const handleSearch = (overrides: SearchParamsOverride = {}) => {
    const newParams = new URLSearchParams();

    // Use overrides if provided, otherwise fall back to state
    const finalTitle = overrides.title ?? title;
    const finalFormat = overrides.format ?? format;
    const finalGenre = overrides.genre ?? genre;
    const finalOrigin = overrides.origin ?? origin;
    const finalReleased = overrides.released ?? released;
    const finalUpdated = overrides.updated ?? updated;
    const finalAvg = overrides.avg ?? avg;
    const finalCount = overrides.count ?? count;
    const finalOrder = overrides.order ?? order;

    if (finalTitle) newParams.set('title', finalTitle);
    finalFormat.forEach((v) => newParams.append('format', v));
    finalGenre.forEach((v) => newParams.append('genre', v));
    finalOrigin.forEach((v) => newParams.append('origin', v));
    finalReleased.forEach((v) => newParams.append('released', v));
    finalUpdated.forEach((v) => newParams.append('updated', v));
    if (finalAvg) newParams.set('avg', finalAvg);
    if (finalCount) newParams.set('count', finalCount);
    if (finalOrder) {
      newParams.set('order', finalOrder);
    } else {
      setOrder('popularity-desc');
      newParams.set('order', 'popularity-desc');
    }

    // Always reset to page 1 for a new search
    newParams.set('page', '1');

    router.push(`/search?${newParams.toString()}`);
  };

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
    // ✨ 4. Expose the new function through the context
    handleSearch,
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
