import { Suspense } from 'react';
import SearchBarFallback from './searchbar/SearchBarFallback';
import SearchBar from './searchbar/SearchBar';
import ActiveLabels from './label/ActiveLabels';
import ActiveLabelsFallback from './label/ActiveLabelsFallback';
import { api } from '~/trpc/server';

export default async function SearchSection() {
  const filterOptions = await api.media.getFilterOptions();
  return (
    <div className="flex flex-col justify-center gap-8 sm:gap-9 md:gap-10 lg:gap-11 xl:gap-12">
      {/* <Suspense fallback={<SearchBarFallback />}> */}
      <SearchBar showOrder={true} filterOptions={filterOptions} />
      {/* </Suspense> */}

      {/* <Suspense fallback={<ActiveLabelsFallback />}> */}
      <ActiveLabels filterOptions={filterOptions} />
      {/* </Suspense> */}
    </div>
  );
}
