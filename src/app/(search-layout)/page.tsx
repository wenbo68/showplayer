import { api, HydrateClient } from '~/trpc/server';
import MediaList from '../_components/media/MediaList';
import { auth } from '~/server/auth';
import IdSubmitter from '../_components/submit/IdSubmitter';
import SubmissionHistory from '../_components/submit/SubmissionHistory';
import TrendingCarousel from '../_components/media/TrendingCarousel';
// import SearchSection from '../_components/search/SearchSection';

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
        order: 'popularity-desc',
        page: 1,
        pageSize: 6,
      }),
      api.media.searchAndFilter({
        format: ['tv'],
        minVoteAvg: 0,
        minVoteCount: 0,
        order: 'popularity-desc',
        page: 1,
        pageSize: 6,
      }),
      api.media.searchAndFilter({
        format: ['movie'],
        minVoteAvg: 0,
        minVoteCount: 300,
        order: 'vote-avg-desc',
        page: 1,
        pageSize: 6,
      }),
      api.media.searchAndFilter({
        format: ['tv'],
        minVoteAvg: 0,
        minVoteCount: 300,
        order: 'vote-avg-desc',
        page: 1,
        pageSize: 6,
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
    api.user.getUserSubmissions.prefetch();
  }

  // carousel doesn't work well bc tmdb backdrop have different heights
  // also theres no guarantee that trending table will have at least 1 media with src (best case scenario is that we have 10)
  return (
    <HydrateClient>
      <>
        {/* <div className="flex flex-col justify-center gap-8"> */}
        {/* <TrendingCarousel
          pageMediaIds={uniquePageMediaIds}
          trendingList={trendingList}
        /> */}

        {/* <div className="p-2 w-full flex flex-col gap-8"> */}
        {/* <div className="w-full flex flex-col gap-10"> */}
        <MediaList
          pageMediaIds={uniquePageMediaIds}
          mediaList={popularMvList}
          viewMode="preview"
          label="POPULAR MOVIES"
          link="/search?format=movie&order=popularity-desc&page=1"
        />
        <MediaList
          pageMediaIds={uniquePageMediaIds}
          mediaList={popularTvList}
          viewMode="preview"
          label="POPULAR SHOWS"
          link="/search?format=tv&order=popularity-desc&page=1"
        />
        <MediaList
          pageMediaIds={uniquePageMediaIds}
          mediaList={topMvList}
          viewMode="preview"
          label="TOP MOVIES"
          link="/search?format=movie&count=300&order=vote-avg-desc&page=1"
        />
        <MediaList
          pageMediaIds={uniquePageMediaIds}
          mediaList={topTvList}
          viewMode="preview"
          label="TOP SHOWS"
          link="/search?format=tv&count=300&order=vote-avg-desc&page=1"
        />
        {/* </div>

          <div className="w-full flex flex-col gap-10"> */}
        {/* <UtcTime /> */}
        <IdSubmitter />
        <SubmissionHistory />
        {/* </div> */}
        {/* </div> */}
        {/* </div> */}
      </>
    </HydrateClient>
  );
}
