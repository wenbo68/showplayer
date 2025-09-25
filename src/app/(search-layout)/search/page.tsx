// ~/app/search/page.tsx

import { Suspense } from 'react';
import SearchResults from '../../_components/search/SearchResult';
import MediaListFallback from '../../_components/media/MediaListFallback';
import { api } from '~/trpc/server';

// have to make client now that searchbar and active labels are responsive
// otherwise can have glitches: the new search page will reset the client state to match with the url
// meaning if you make changes right before the page arrives, the reset will wipe out your changes
export default async function SearchPage({}) {
  // get filter options from trpc
  const filterOptions = await api.media.getFilterOptions();

  // just use traditional pagination instead of infinite scrolling (harder to use go back/forward in browser)
  return (
    <>
      {/* <div className="flex flex-col justify-center gap-8"> */}
      {/* <Suspense fallback={<SearchBarFallback />}>
        <SearchBar showOrder={true} filterOptions={filterOptions} />
      </Suspense>

      <Suspense fallback={<ActiveLabelsFallback />}>
        <ActiveLabels filterOptions={filterOptions} />
      </Suspense> */}

      <Suspense fallback={<MediaListFallback />}>
        <SearchResults />
      </Suspense>
      {/* </div> */}
    </>
  );
}
