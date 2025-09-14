import { api, HydrateClient } from '~/trpc/server';
import SearchBar from './_components/search/SearchBar';
import { Suspense } from 'react';
import MediaList from './_components/media/MediaList';
import SearchBarFallback from './_components/search/SearchBarFallback';
import { auth } from '~/server/auth';
import IdSubmitter from './_components/submit/IdSubmitter';
import SubmissionHistory from './_components/submit/SubmissionHistory';

export default async function Home() {
  const session = await auth();

  // --- 1. Fetch all four lists in parallel using your search API ---
  const [popularMvData, popularTvData, topMvData, topTvData, filterOptions] =
    await Promise.all([
      api.media.searchAndFilter({
        format: ['movie'],
        minVoteAvg: 0,
        minVoteCount: 0,
        order: 'popularity-desc',
        page: 1,
        pageSize: 15,
      }),
      api.media.searchAndFilter({
        format: ['tv'],
        minVoteAvg: 0,
        minVoteCount: 0,
        order: 'popularity-desc',
        page: 1,
        pageSize: 15,
      }),
      api.media.searchAndFilter({
        format: ['movie'],
        minVoteAvg: 0,
        minVoteCount: 300,
        order: 'vote-avg-desc',
        page: 1,
        pageSize: 15,
      }),
      api.media.searchAndFilter({
        format: ['tv'],
        minVoteAvg: 0,
        minVoteCount: 300,
        order: 'vote-avg-desc',
        page: 1,
        pageSize: 15,
      }),
      api.media.getFilterOptions(),
    ]);

  // Extract the media from the response objects
  const popularMvList = popularMvData.pageMedia;
  const popularTvList = popularTvData.pageMedia;
  const topMvList = topMvData.pageMedia;
  const topTvList = topTvData.pageMedia;

  // need to pass down all media ids on the page so that optimistically updating of one media will apply to copies of that same media on the entire page
  // eg this home page may have multiple media lists that may or may not share the some same media
  const pageMediaIds = [
    ...popularMvList.map((m) => m.media.id),
    ...popularTvList.map((m) => m.media.id),
    ...topMvList.map((m) => m.media.id),
    ...topTvList.map((m) => m.media.id),
  ];
  const uniquePageMediaIds = [...new Set(pageMediaIds)];

  // if user is logged in
  // prefetch user list status for all media in the page
  // prefetch user submission history
  if (session?.user) {
    api.user.getUserDetailsForMediaList.prefetch({
      mediaIds: uniquePageMediaIds,
    });
    api.user.getUserSubmissions.prefetch();
  }

  return (
    <HydrateClient>
      <div className="flex flex-col justify-center p-4 gap-12">
        <Suspense fallback={<SearchBarFallback />}>
          <SearchBar filterOptions={filterOptions} />
        </Suspense>

        <div className="w-full flex flex-col gap-8">
          {/* --- 3. Render the four new MediaList previews with correct links --- */}
          <MediaList
            pageMediaIds={uniquePageMediaIds}
            mediaList={popularMvList}
            viewMode="preview"
            label="POPULAR MOVIES"
            link="/search?format=movie&avg=0&count=0&order=popularity-desc&page=1"
          />
          <MediaList
            pageMediaIds={uniquePageMediaIds}
            mediaList={popularTvList}
            viewMode="preview"
            label="POPULAR SHOWS"
            link="/search?format=tv&avg=0&count=0&order=popularity-desc&page=1"
          />
          <MediaList
            pageMediaIds={uniquePageMediaIds}
            mediaList={topMvList}
            viewMode="preview"
            label="TOP MOVIES"
            link="/search?format=movie&avg=0&count=300&order=vote-avg-desc&page=1"
          />
          <MediaList
            pageMediaIds={uniquePageMediaIds}
            mediaList={topTvList}
            viewMode="preview"
            label="TOP SHOWS"
            link="/search?format=tv&avg=0&count=300&order=vote-avg-desc&page=1"
          />
        </div>

        <div className="w-full flex flex-col gap-10">
          <IdSubmitter />
          <SubmissionHistory />
        </div>
      </div>
    </HydrateClient>
  );
}
