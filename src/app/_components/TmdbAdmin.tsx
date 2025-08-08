'use client';

import { api } from '~/trpc/react';

export default function TmdbAdmin() {
  const clearTmdbTrendingMutation = api.media.clearTmdbTrending.useMutation();
  const fetchTmdbTrendingMutation = api.media.fetchTmdbTrending.useMutation();
  const populateDetailsMutation = api.media.populateMediaDetails.useMutation();
  const dailySrcFetchMutation = api.media.dailySrcFetch.useMutation();
  // const clearAnilistTrendingMutation =
  //   api.media.clearAnilistTrending.useMutation();
  // const fetchAnilistTrendingMutation =
  //   api.media.fetchAnilistTrending.useMutation();
  // const populateAnilistEpisodesMutation =
  //   api.media.populateAnilistEpisodes.useMutation();
  // const fetchTvSourceMutation =
  //   api.media.fetchEpisodeSourceFromVidsrc.useMutation();
  const fetchMvSrcMutation = api.media.fetchAndInsertMvSrc.useMutation();
  const fetchTvSrcMutation = api.media.fetchAndInsertTvSrc.useMutation();
  const insertEpisodeMutation = api.media.insertSeasonAndEpisode.useMutation();

  const handleClearTmdbTrending = () => {
    clearTmdbTrendingMutation.mutate(undefined, {
      onSuccess: () => console.log('Trending cleared'),
      onError: (err) => console.error('Error clearing trending:', err),
    });
  };
  const handleFetchTmdbTrending = () => {
    fetchTmdbTrendingMutation.mutate(
      { limit: 50 },
      {
        onSuccess: (data) => console.log('Fetched:', data),
        onError: (err) => console.error('Error:', err),
      }
    );
  };
  const handlePopulateDetails = () => {
    populateDetailsMutation.mutate(undefined, {
      onSuccess: () => console.log('Populated details'),
      onError: (err) => console.error('Error populating details: ', err),
    });
  };
  const handleDailySrcFetch = () => {
    dailySrcFetchMutation.mutate(undefined, {
      onSuccess: () => console.log('Daily src fetch finished'),
      onError: (err) => console.error('Error fetching daily src: ', err),
    });
  };
  // const handleClearAnilistTrending = () => {
  //   clearAnilistTrendingMutation.mutate(undefined, {
  //     onSuccess: () => console.log('Anilist trending cleared'),
  //     onError: (err) => console.error('Error clearing Anilist trending:', err),
  //   });
  // };
  // const handleFetchAnilistTrending = () => {
  //   fetchAnilistTrendingMutation.mutate(
  //     { limit: 50 },
  //     {
  //       onSuccess: (data) => console.log('Fetched:', data),
  //       onError: (err) => console.error('Error:', err),
  //     }
  //   );
  // };
  // const handlePopulateAnilistEpisodes = () => {
  //   populateAnilistEpisodesMutation.mutate(undefined, {
  //     onSuccess: () => console.log('Anilist episodes populated'),
  //     onError: (err) =>
  //       console.error('Error populating Anilist episodes:', err),
  //   });
  // };
  const handleFetchMvSrc = () => {
    fetchMvSrcMutation.mutate(
      { tmdbId: 803796 },
      {
        onSuccess: (data) => console.log('Fetched source:', data),
        onError: (err) => console.error('Error fetching source:', err),
      }
    );
  };
  const handleFetchTvSrc = () => {
    fetchTvSrcMutation.mutate(
      { tmdbId: 240411, season: 1, episode: 2 },
      {
        onSuccess: (data) => console.log('Fetched TV source:', data),
        onError: (err) => console.error('Error fetching TV source:', err),
      }
    );
  };
  const handleInsertEpisode = () => {
    insertEpisodeMutation.mutate(
      { tmdbId: 240411, season: 1, episode: 2 },
      {
        onSuccess: (data) => console.log('Fetched TV source:', data),
        onError: (err) => console.error('Error fetching TV source:', err),
      }
    );
  };

  return (
    <section className="flex flex-col items-center justify-center">
      <button
        onClick={handleClearTmdbTrending}
        disabled={clearTmdbTrendingMutation.isPending}
        className="px-4 py-2 bg-red-600 text-white rounded"
      >
        {clearTmdbTrendingMutation.isPending
          ? 'Clearing...'
          : 'Clear Tmdb Trending'}
      </button>
      {clearTmdbTrendingMutation.error && (
        <p className="text-red-500 mt-2">
          Error: {clearTmdbTrendingMutation.error.message}
        </p>
      )}
      {/* <button
        onClick={handleClearAnilistTrending}
        disabled={clearAnilistTrendingMutation.isPending}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        {clearAnilistTrendingMutation.isPending
          ? 'Clearing...'
          : 'Clear Anilist Trending'}
      </button>
      {clearAnilistTrendingMutation.error && (
        <p className="text-red-500 mt-2">
          Error: {clearAnilistTrendingMutation.error.message}
        </p>
      )} */}
      <button
        onClick={handleFetchTmdbTrending}
        disabled={fetchTmdbTrendingMutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {fetchTmdbTrendingMutation.isPending
          ? 'Fetching...'
          : 'Fetch TMDB Trending'}
      </button>
      {fetchTmdbTrendingMutation.error && (
        <p className="text-red-500">
          Error: {fetchTmdbTrendingMutation.error.message}
        </p>
      )}
      <button
        onClick={handlePopulateDetails}
        disabled={populateDetailsMutation.isPending}
        className="px-4 py-2 bg-red-600 text-white rounded"
      >
        {populateDetailsMutation.isPending
          ? 'Populating...'
          : 'Populate media details'}
      </button>
      {populateDetailsMutation.error && (
        <p className="text-red-500 mt-2">
          Error: {populateDetailsMutation.error.message}
        </p>
      )}
      <button
        onClick={handleDailySrcFetch}
        disabled={dailySrcFetchMutation.isPending}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {dailySrcFetchMutation.isPending ? 'Fetching...' : 'Daily src fetch'}
      </button>
      {dailySrcFetchMutation.error && (
        <p className="text-red-500">
          Error: {dailySrcFetchMutation.error.message}
        </p>
      )}
      {/* <button
        onClick={handleFetchAnilistTrending}
        disabled={fetchAnilistTrendingMutation.isPending}
        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded"
      >
        {fetchAnilistTrendingMutation.isPending
          ? 'Fetching...'
          : 'Fetch Anilist Trending'}
      </button>
      {fetchAnilistTrendingMutation.error && (
        <p className="text-red-500 mt-2">
          Error: {fetchAnilistTrendingMutation.error.message}
        </p>
      )} */}
      {/* <button
        onClick={handlePopulateAnilistEpisodes}
        disabled={populateAnilistEpisodesMutation.isPending}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
      >
        {populateAnilistEpisodesMutation.isPending
          ? 'Populating...'
          : 'Populate Anilist Episodes'}
      </button>
      {populateAnilistEpisodesMutation.error && (
        <p className="text-red-500 mt-2">
          Error: {populateAnilistEpisodesMutation.error.message}
        </p>
      )} */}
      <button
        onClick={handleFetchMvSrc}
        disabled={fetchMvSrcMutation.isPending}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
      >
        {fetchMvSrcMutation.isPending
          ? 'Fetching mv Source...'
          : 'Fetch mv Source'}
      </button>
      {fetchMvSrcMutation.error && (
        <p className="text-red-500 mt-2">
          Error: {fetchMvSrcMutation.error.message}
        </p>
      )}
      <button
        onClick={handleFetchTvSrc}
        disabled={fetchTvSrcMutation.isPending}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
      >
        {fetchTvSrcMutation.isPending
          ? 'Fetching TV Source...'
          : 'Fetch TV Source'}
      </button>
      {fetchTvSrcMutation.error && (
        <p className="text-red-500 mt-2">
          Error: {fetchTvSrcMutation.error.message}
        </p>
      )}

      {/* <button
        onClick={handleFillIds}
        disabled={fillIdsMutation.isPending}
        className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
      >
        {fillIdsMutation.isPending ? 'Fetching Source...' : 'Fetch TV Source'}
      </button>
      {fillIdsMutation.error && (
        <p className="text-red-500 mt-2">
          Error: {fillIdsMutation.error.message}
        </p>
      )} */}

      <button
        onClick={handleInsertEpisode}
        disabled={insertEpisodeMutation.isPending}
        className="mt-4 px-4 py-2 bg-green-600 text-white rounded"
      >
        {insertEpisodeMutation.isPending ? 'inserting...' : 'insert episode'}
      </button>
      {insertEpisodeMutation.error && (
        <p className="text-red-500 mt-2">
          Error: {insertEpisodeMutation.error.message}
        </p>
      )}
    </section>
  );
}
