import { api, HydrateClient } from '~/trpc/server';
import MediaList from '../_components/media/MediaList';
import { auth } from '~/server/auth';
import { Suspense } from 'react';
import MediaListFallback from '../_components/media/MediaListFallback';

export default async function Home() {
  const session = await auth();

  // --- 1. Fetch all four lists in parallel using your search API ---
  const [trendingList, popularMvData, popularTvData, topMvData, topTvData] =
    await Promise.all([
      api.media.getTopTrending({ limit: 10 }),
      api.media.searchAndFilter({
        format: ['movie'],
        minVoteAvg: 0,
        minVoteCount: 0,
        // minAvail: '0',
        order: 'popularity-desc',
        page: 1,
        pageSize: 6,
        needTotalPages: false,
      }),
      api.media.searchAndFilter({
        format: ['tv'],
        minVoteAvg: 0,
        minVoteCount: 0,
        // minAvail: '0',
        order: 'popularity-desc',
        page: 1,
        pageSize: 6,
        needTotalPages: false,
      }),
      api.media.searchAndFilter({
        format: ['movie'],
        minVoteAvg: 0,
        minVoteCount: 300,
        // minAvail: '0',
        order: 'vote-avg-desc',
        page: 1,
        pageSize: 6,
        needTotalPages: false,
      }),
      api.media.searchAndFilter({
        format: ['tv'],
        minVoteAvg: 0,
        minVoteCount: 300,
        // minAvail: '0',
        order: 'vote-avg-desc',
        page: 1,
        pageSize: 6,
        needTotalPages: false,
      }),
      // api.media.getFilterOptions(),
    ]);

  // Extract the media from the response objects
  const popularMvList = popularMvData.pageMedia;
  const popularTvList = popularTvData.pageMedia;
  const topMvList = topMvData.pageMedia;
  const topTvList = topTvData.pageMedia;

  // need to pass down all media ids on the page so that optimistically updating of one media will apply to copies of that same media on the entire page
  // eg this home page may have multiple media lists that may or may not share the some same media
  const pageMediaIds = [
    ...trendingList.map((m) => m.media.id),
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
  }

  return (
    <HydrateClient>
      {/* <> */}
      <Suspense
        fallback={
          <MediaListFallback
            viewMode={'preview'}
            label={'POPULAR MOVIES'}
            count={6}
          />
        }
      >
        <MediaList
          pageMediaIds={uniquePageMediaIds}
          mediaList={popularMvList}
          viewMode="preview"
          label="POPULAR MOVIES"
          link="/search?format=movie&order=popularity-desc&page=1"
        />
      </Suspense>

      <Suspense
        fallback={
          <MediaListFallback
            viewMode={'preview'}
            label={'POPULAR SHOWS'}
            count={6}
          />
        }
      >
        <MediaList
          pageMediaIds={uniquePageMediaIds}
          mediaList={popularTvList}
          viewMode="preview"
          label="POPULAR SHOWS"
          link="/search?format=tv&order=popularity-desc&page=1"
        />
      </Suspense>

      <Suspense
        fallback={
          <MediaListFallback
            viewMode={'preview'}
            label={'TOP MOVIES'}
            count={6}
          />
        }
      >
        <MediaList
          pageMediaIds={uniquePageMediaIds}
          mediaList={topMvList}
          viewMode="preview"
          label="TOP MOVIES"
          link="/search?format=movie&count=300&order=vote-avg-desc&page=1"
        />
      </Suspense>

      <Suspense
        fallback={
          <MediaListFallback
            viewMode={'preview'}
            label={'TOP SHOWS'}
            count={6}
          />
        }
      >
        <MediaList
          pageMediaIds={uniquePageMediaIds}
          mediaList={topTvList}
          viewMode="preview"
          label="TOP SHOWS"
          link="/search?format=tv&count=300&order=vote-avg-desc&page=1"
        />
      </Suspense>
      {/* </> */}
    </HydrateClient>
  );
}
