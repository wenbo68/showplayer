import { Suspense } from 'react';
import SearchBarFallback from './searchbar/SearchBarFallback';
import SearchBar from './searchbar/SearchBar';
import ActiveLabels from './label/ActiveLabels';
import ActiveLabelsFallback from './label/ActiveLabelsFallback';
import { api } from '~/trpc/server';

export default async function SearchSection() {
  const filterOptions = await api.media.getFilterOptions();
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<SearchBarFallback />}>
        <SearchBar showOrder={true} filterOptions={filterOptions} />
      </Suspense>

      <Suspense fallback={<ActiveLabelsFallback />}>
        <ActiveLabels filterOptions={filterOptions} />
      </Suspense>
    </div>
  );
}
