import { api } from '~/trpc/server';
import ActiveLabels from '../_components/search/label/ActiveLabels';
import SearchBar from '../_components/search/searchbar/SearchBar';
import { Suspense } from 'react';
import SearchBarFallback from '../_components/search/searchbar/SearchBarFallback';
import ActiveLabelsFallback from '../_components/search/label/ActiveLabelsFallback';

export default async function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const filterOptions = await api.media.getFilterOptions();

  return (
    <div className="flex flex-col justify-center gap-8">
      <Suspense fallback={<SearchBarFallback />}>
        <SearchBar showOrder={true} filterOptions={filterOptions} />
      </Suspense>

      <Suspense fallback={<ActiveLabelsFallback />}>
        <ActiveLabels filterOptions={filterOptions} />
      </Suspense>

      {children}
    </div>
  );
}
