// ~/app/search/page.tsx

// import { api } from '~/trpc/server';
// import SearchBar from '../_components/search/searchbar/SearchBar';
import { Suspense } from 'react';
// import SearchBarFallback from '../_components/search/searchbar/SearchBarFallback';
// import ActiveLabels from '../_components/search/label/ActiveLabels';
// import ActiveLabelsFallback from '../_components/search/label/ActiveLabelsFallback';
// import { FilterProvider } from '../_contexts/SearchContext';
import MediaResults from '../_components/search/SearchResult';
// import SearchSection from '../../_components/search/SearchSection';
import MediaListFallback from '../_components/media/MediaListFallback';
import SearchBarFallback from '../_components/search/searchbar/SearchBarFallback';
import ActiveLabelsFallback from '../_components/search/label/ActiveLabelsFallback';
import SearchBar from '../_components/search/searchbar/SearchBar';
import ActiveLabels from '../_components/search/label/ActiveLabels';
import { api } from '~/trpc/server';

// have to make client now that searchbar and active labels are responsive
// otherwise can have glitches: the new search page will reset the client state to match with the url
// meaning if you make changes right before the page arrives, the reset will wipe out your changes
export default async function SearchPage({}) {
  // get filter options from trpc
  const filterOptions = await api.media.getFilterOptions();

  // just use traditional pagination instead of infinite scrolling (harder to use go back/forward in browser)
  return (
    <div className="px-2 pt-4 sm:pt-16 pb-4 flex flex-col justify-center gap-8">
      <Suspense fallback={<SearchBarFallback />}>
        <SearchBar showOrder={true} filterOptions={filterOptions} />
      </Suspense>

      <Suspense fallback={<ActiveLabelsFallback />}>
        <ActiveLabels filterOptions={filterOptions} />
      </Suspense>

      <Suspense fallback={<MediaListFallback />}>
        <MediaResults />
      </Suspense>
    </div>
  );
}
