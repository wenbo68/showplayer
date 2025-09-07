import { api, HydrateClient } from '~/trpc/server';
import TmdbAdmin from './_components/auth/TmdbAdmin';
import SearchBar from './_components/search/SearchBar';
import { Suspense } from 'react';
import MediaList from './_components/media/MediaList';
import SearchBarFallback from './_components/search/SearchBarFallback';
import { auth } from '~/server/auth';

export default async function Home() {
  const session = await auth();

  const trendingList = await api.media.getTmdbTrending();
  const topMvList = await api.media.getTmdbTopRatedMv();
  const topTvList = await api.media.getTmdbTopRatedTv();
  const filterOptions = await api.media.getFilterOptions();

  // need to pass down all media ids on the page so that optimistically updating of one media will apply to copies of that same media on the entire page
  // eg this home page may have multiple media lists that may or may not share the some same media
  const pageMediaIds = [
    ...trendingList.map((m) => m.media.id),
    ...topMvList.map((m) => m.media.id),
    ...topTvList.map((m) => m.media.id),
  ];
  const uniquePageMediaIds = [...new Set(pageMediaIds)];

  // Perform a SINGLE prefetch for the entire page (only if user logged in)
  if (session?.user) {
    api.media.getUserDetailsForMediaList.prefetch({
      mediaIds: uniquePageMediaIds,
    });
  }

  return (
    <HydrateClient>
      <div className="flex flex-col items-center justify-center p-4 gap-10">
        {session?.user.role === 'admin' && <TmdbAdmin />}

        <Suspense fallback={<SearchBarFallback />}>
          <SearchBar filterOptions={filterOptions} />
        </Suspense>

        <div className="w-full flex flex-col gap-8">
          <MediaList
            pageMediaIds={uniquePageMediaIds}
            mediaList={trendingList}
            viewMode="preview"
            label="TRENDING NOW"
            link="/trending"
          />
          <MediaList
            pageMediaIds={uniquePageMediaIds}
            mediaList={topMvList}
            viewMode="preview"
            label="TOP MOVIES"
            link="/top/movie"
          />
          <MediaList
            pageMediaIds={uniquePageMediaIds}
            mediaList={topTvList}
            viewMode="preview"
            label="TOP SHOWS"
            link="/top/tv"
          />
        </div>
      </div>
    </HydrateClient>
  );
}
