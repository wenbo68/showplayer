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
import { useSessionStorageState } from '../_hooks/sessionStorageHooks';

// Define the context type
type FilterContextType = {
  title: string;
  setTitle: Dispatch<SetStateAction<string>>;
  format: string[];
  setFormat: Dispatch<SetStateAction<string[]>>;
  genre: string[];
  setGenre: Dispatch<SetStateAction<string[]>>;
  genreOp: string;
  setGenreOp: Dispatch<SetStateAction<string>>;
  origin: string[];
  setOrigin: Dispatch<SetStateAction<string[]>>;
  // originOp: string;
  // setOriginOp: Dispatch<SetStateAction<string>>;
  released: string[];
  setReleased: Dispatch<SetStateAction<string[]>>;
  updated: string[];
  setUpdated: Dispatch<SetStateAction<string[]>>;
  avg: string;
  setAvg: Dispatch<SetStateAction<string>>;
  count: string;
  setCount: Dispatch<SetStateAction<string>>;
  avail: string;
  setAvail: Dispatch<SetStateAction<string>>;
  list: string[];
  setList: Dispatch<SetStateAction<string[]>>;
  order: string;
  setOrder: Dispatch<SetStateAction<string>>;
  handleSearch: (
    overrides?: Partial<{
      title: string;
      format: string[];
      genre: string[];
      genreOp: string;
      origin: string[];
      released: string[];
      updated: string[];
      avg: string;
      count: string;
      avail: string;
      list: string[];
      order: string;
    }>
  ) => void;
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

// this provider uses client-side hooks (eg useSearchParams) so cannot be directly included in root layout
// best practice is to create a client component that includes all contexts
// then use this 1 component in root layout
export function FilterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  const [avail, setAvail] = useState(searchParams.get('avail') ?? '');
  const [list, setList] = useState(searchParams.getAll('list') ?? '');
  const [order, setOrder] = useSessionStorageState(
    'order',
    searchParams.get('order') ?? ''
  );
  const [genreOp, setGenreOp] = useSessionStorageState(
    'genre-op',
    searchParams.get('genre-op') ?? ''
  );
  // const [originOp, setOriginOp] = useSessionStorageState(
  //   'origin-op',
  //   ''
  // );
  // const [page, setPage] = useState(searchParams.get('page') ?? '');

  // 2. I want the sync url to state useEffect to only run in the following scenarios:
  // when url change is triggered by go back/forward
  // when user clicks link to home/search page
  // when user manually changes url
  useEffect(() => {
    console.log(`CALLED SYNC`);
    setTitle(searchParams.get('title') ?? '');
    setFormat(searchParams.getAll('format'));
    setGenreOp(searchParams.get('genre-op') ?? '');
    setGenre(searchParams.getAll('genre'));
    setOrigin(searchParams.getAll('origin'));
    setReleased(searchParams.getAll('released'));
    setUpdated(searchParams.getAll('updated'));
    setAvg(searchParams.get('avg') ?? '');
    setCount(searchParams.get('count') ?? '');
    setAvail(searchParams.get('avail') ?? '');
    setList(searchParams.getAll('list') ?? '');
    setOrder(searchParams.get('order') ?? '');
    // setOriginOp(searchParams.get('origin-op') ?? '');
  }, [searchParams]);
  // spam clicking on search page: click new filter, state updates, url pushed, url syncs to state -> click new filter, state updates, ....
  // each cycle is too fast that you cannot click fast enough to trigger a flicker

  // Normal sequence on home page: click new filter, state updates, url pushed, router schedules mount, comp dismount, comp remount, states initialized from url

  // Extra click right before dismount: click new filter, state updates, url pushed, router schedules mount,
  // click another filter, state updates, url pushed, router schedules rerender,
  // comp dismount, comp mounts, states initialized from 1st url, comp rerenders, useEffect syncs 2nd url to states

  // FLICKER PROBLEM: caused by the searchbar & active label component dismounting/remounting when you go from home to search page
  // SOLUTION: put the shared components in layout so that the component never dismount

  type SearchParamsOverride = Partial<{
    title: string;
    format: string[];
    genre: string[];
    origin: string[];
    released: string[];
    updated: string[];
    avg: string;
    count: string;
    avail: string;
    order: string;
    genreOp: string;
    originOp: string;
    list: string[];
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
    const finalAvail = overrides.avail ?? avail;
    const finalOrder = overrides.order ?? order;
    const finalGenreOp = overrides.genreOp ?? genreOp;
    // const finalOriginOp = overrides.originOp ?? originOp;
    const finalList = overrides.list ?? list;

    if (finalTitle) newParams.set('title', finalTitle);
    finalFormat.forEach((v) => newParams.append('format', v));
    finalGenre.forEach((v) => newParams.append('genre', v));
    finalOrigin.forEach((v) => newParams.append('origin', v));
    finalReleased.forEach((v) => newParams.append('released', v));
    finalUpdated.forEach((v) => newParams.append('updated', v));
    if (finalAvg) newParams.set('avg', finalAvg);
    if (finalCount) newParams.set('count', finalCount);
    if (finalAvail) newParams.set('avail', finalAvail);
    if (finalOrder) {
      newParams.set('order', finalOrder);
    } else {
      setOrder('popularity-desc');
      newParams.set('order', 'popularity-desc');
    }

    if (finalGenreOp) {
      newParams.set('genre-op', finalGenreOp);
    } else {
      if (finalGenre.length > 0) {
        setGenreOp('and');
        newParams.set('genre-op', 'and');
      }
    }
    // if (finalOrigin.length > 0) {
    //   if (finalOriginOp) {
    //     newParams.set('origin-op', finalOriginOp);
    //   } else {
    //     setOriginOp('or');
    //     newParams.set('origin-op', 'or');
    //   }
    // }

    finalList.forEach((v) => newParams.append('list', v));

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
    genreOp,
    setGenreOp,
    origin,
    setOrigin,
    // originOp,
    // setOriginOp,
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
    list,
    setList,
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

// 3. what is useDebouncedCallback?
// each time the function is called, its execution is delayed by set amount of time
// if function called again within this delay, delay timer resets
// at the end of timer, only the latest call is executed

// 4. sync state to url
// done only when new url would be different from old url
// otherwise search page will rerender bc this useEffect will be called again after the above useEffect changes state during its 1st run

// 5. normally you include all used variables in dependency array
// but there are exceptions:
// 1. unstable obj: even if obj value didn't change, the obj is considered changed; eg searchParams, router, etc.
// 2. obj that never changes: ref
// 3. global singletons: window, document, localStorage, etc.
// ...
