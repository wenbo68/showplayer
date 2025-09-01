import { api, HydrateClient } from '~/trpc/server';
import TmdbAdmin from './_components/TmdbAdmin';
import SearchBar from './_components/search/SearchBar';
import { Suspense } from 'react';
import MediaList from './_components/media/MediaList';
import type { FilterOptions } from '~/type';

// A simple loading skeleton for your SearchBar
function SearchBarFallback() {
  return (
    <div className="w-full flex gap-4 flex-auto text-sm text-gray-400 animate-pulse">
      <div className="w-full flex flex-col gap-3">
        <div className="h-5 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-800 rounded"></div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <div className="h-5 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-800 rounded"></div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <div className="h-5 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-800 rounded"></div>
      </div>
      <div className="w-full flex flex-col gap-3">
        <div className="h-5 bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-800 rounded"></div>
      </div>
    </div>
  );
}

export default async function Home() {
  const trendingList = await api.media.getTmdbTrending();
  const topMvList = await api.media.getTmdbTopRatedMv();
  const topTvList = await api.media.getTmdbTopRatedTv();
  const filterOptions = await api.media.getFilterOptions();

  return (
    <HydrateClient>
      <main className="flex flex-col items-center justify-center p-4 gap-8">
        <TmdbAdmin />

        <Suspense fallback={<SearchBarFallback />}>
          <SearchBar filterOptions={filterOptions} />
        </Suspense>

        <MediaList
          mediaList={trendingList}
          viewMode="preview"
          label="TRENDING NOW"
          link="/trending"
        />
        <MediaList
          mediaList={topMvList}
          viewMode="preview"
          label="TOP MOVIES"
          link="/top/movie"
        />
        <MediaList
          mediaList={topTvList}
          viewMode="preview"
          label="TOP SHOWS"
          link="/top/tv"
        />
      </main>
    </HydrateClient>
  );
}
