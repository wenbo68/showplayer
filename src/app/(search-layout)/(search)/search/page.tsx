// ~/app/search/page.tsx

import { Suspense } from 'react';
import SearchResults from '../../../_components/search/SearchResult';
import MediaListFallback from '../../../_components/media/MediaListFallback';

// have to make client now that searchbar and active labels are responsive
// otherwise can have glitches: the new search page will reset the client state to match with the url
// meaning if you make changes right before the page arrives, the reset will wipe out your changes
export default async function SearchPage({}) {
  return (
    // suspense is needed in 2 cases:
    // 1. the wrapped component is an async server component that that awaits some function
    // 2. the wrapped component is a client component that uses useSearchParams
    <Suspense fallback={<MediaListFallback label="SEARCH RESULTS" />}>
      <SearchResults />
    </Suspense>
  );
}
