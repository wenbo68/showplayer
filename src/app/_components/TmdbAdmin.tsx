'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

export default function TmdbAdmin() {
  const [trendingLimit, setTrendingLimit] = useState(50);
  const [topLimit, setTopLimit] = useState(100);
  const [mvTmdbId, setMvTmdbId] = useState('');
  const [tvTmdbId, setTvTmdbId] = useState('');
  const [season, setSeason] = useState('');
  const [episode, setEpisode] = useState('');

  const fetchOriginsMutation = api.media.fetchOrigins.useMutation();
  const fetchGenresMutation = api.media.fetchGenres.useMutation();

  const fetchTmdbTrendingMutation = api.media.fetchTmdbTrending.useMutation();
  const fetchTmdbTopMutation = api.media.fetchTmdbTopRated.useMutation();

  const populateDetailsMutation = api.media.populateMediaDetails.useMutation();
  const dailySrcFetchMutation = api.media.mediaSrcFetch.useMutation();

  const fetchMvSrcMutation = api.media.fetchAndInsertMvSrc.useMutation();
  const insertEpisodeMutation = api.media.insertSeasonAndEpisode.useMutation();
  const fetchTvSrcMutation = api.media.fetchAndInsertTvSrc.useMutation();

  const handleFetchOrigins = () => {
    fetchOriginsMutation.mutate(undefined, {
      onSuccess: (data) => console.log('Fetch origins:', data),
      onError: (err) => console.log('Error:', err),
    });
  };
  const handleFetchGenres = () => {
    fetchGenresMutation.mutate(undefined, {
      onSuccess: (data) => console.log('Fetch genres:', data),
      onError: (err) => console.error('Error:', err),
    });
  };
  const handleFetchTmdbTrending = () => {
    fetchTmdbTrendingMutation.mutate(
      { limit: trendingLimit },
      {
        onSuccess: (data) => console.log('Fetched:', data),
        onError: (err) => console.error('Error:', err),
      }
    );
  };
  const handleFetchTmdbTop = () => {
    fetchTmdbTopMutation.mutate(
      { limit: topLimit },
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
  const handleFetchMvSrc = () => {
    fetchMvSrcMutation.mutate(
      { tmdbId: Number(mvTmdbId) },
      {
        onSuccess: (data) => console.log('Fetched source:', data),
        onError: (err) => console.error('Error fetching source:', err),
      }
    );
  };
  const handleInsertEpisode = () => {
    insertEpisodeMutation.mutate(
      {
        tmdbId: Number(tvTmdbId),
        season: Number(season),
        episode: Number(episode),
      },
      {
        onSuccess: (data) => console.log('Fetched TV source:', data),
        onError: (err) => console.error('Error fetching TV source:', err),
      }
    );
  };
  const handleFetchTvSrc = () => {
    fetchTvSrcMutation.mutate(
      {
        tmdbId: Number(tvTmdbId),
        season: Number(season),
        episode: Number(episode),
      },
      {
        onSuccess: (data) => console.log('Fetched TV source:', data),
        onError: (err) => console.error('Error fetching TV source:', err),
      }
    );
  };

  return (
    <section className="flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <button
          onClick={handleFetchOrigins}
          disabled={fetchOriginsMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:hover:bg-red-500"
        >
          {fetchOriginsMutation.isPending
            ? 'Fetching origins...'
            : 'Fetch origins'}
        </button>
        {fetchOriginsMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {fetchOriginsMutation.error.message}
          </p>
        )}
        <button
          onClick={handleFetchGenres}
          disabled={fetchGenresMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:hover:bg-red-500"
        >
          {fetchGenresMutation.isPending
            ? 'Fetching genres...'
            : 'Fetch genres'}
        </button>
        {fetchGenresMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {fetchGenresMutation.error.message}
          </p>
        )}

        <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

        <input
          type="number"
          placeholder="Trending Limit"
          value={trendingLimit}
          onChange={(e) => setTrendingLimit(Number(e.target.value))}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <button
          onClick={handleFetchTmdbTrending}
          disabled={fetchTmdbTrendingMutation.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 dark:hover:bg-green-500"
        >
          {fetchTmdbTrendingMutation.isPending
            ? 'Fetching...'
            : 'Fetch Trending'}
        </button>
        {fetchTmdbTrendingMutation.error && (
          <p className="text-red-600 dark:text-red-400">
            Error: {fetchTmdbTrendingMutation.error.message}
          </p>
        )}
        <input
          type="number"
          placeholder="Top Rated Limit"
          value={topLimit}
          onChange={(e) => setTopLimit(Number(e.target.value))}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <button
          onClick={handleFetchTmdbTop}
          disabled={fetchTmdbTopMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-500"
        >
          {fetchTmdbTopMutation.isPending ? 'Fetching...' : 'Fetch Top Rated'}
        </button>
        {fetchTmdbTopMutation.error && (
          <p className="text-red-600 dark:text-red-400">
            Error: {fetchTmdbTopMutation.error.message}
          </p>
        )}

        <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

        <button
          onClick={handlePopulateDetails}
          disabled={populateDetailsMutation.isPending}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:hover:bg-red-500"
        >
          {populateDetailsMutation.isPending
            ? 'Populating...'
            : 'Populate media details'}
        </button>
        {populateDetailsMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {populateDetailsMutation.error.message}
          </p>
        )}
        <button
          onClick={handleDailySrcFetch}
          disabled={dailySrcFetchMutation.isPending}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-500"
        >
          {dailySrcFetchMutation.isPending ? 'Fetching...' : 'Daily src fetch'}
        </button>
        {dailySrcFetchMutation.error && (
          <p className="text-red-600 dark:text-red-400">
            Error: {dailySrcFetchMutation.error.message}
          </p>
        )}
      </div>

      <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

      <div className="flex flex-col items-center gap-2">
        <input
          type="number"
          placeholder="Movie TMDB ID"
          value={mvTmdbId}
          onChange={(e) => setMvTmdbId(e.target.value)}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <button
          onClick={handleFetchMvSrc}
          disabled={fetchMvSrcMutation.isPending}
          className="px-4 py-2 bg-green-600 text-white rounded w-60 hover:bg-green-700 dark:hover:bg-green-500"
        >
          {fetchMvSrcMutation.isPending
            ? 'Fetching Source...'
            : 'Fetch Movie Source'}
        </button>
        {fetchMvSrcMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {fetchMvSrcMutation.error.message}
          </p>
        )}
      </div>

      <hr className="w-full my-4 border-gray-300 dark:border-gray-700" />

      <div className="flex flex-col items-center gap-2">
        <input
          type="number"
          placeholder="TV Show TMDB ID"
          value={tvTmdbId}
          onChange={(e) => setTvTmdbId(e.target.value)}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <input
          type="number"
          placeholder="Season Number"
          value={season}
          onChange={(e) => setSeason(e.target.value)}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <input
          type="number"
          placeholder="Episode Number"
          value={episode}
          onChange={(e) => setEpisode(e.target.value)}
          className="px-3 py-2 rounded w-60 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
        />
        <div className="flex gap-2 w-60">
          <button
            onClick={handleInsertEpisode}
            disabled={insertEpisodeMutation.isPending}
            className="px-4 py-2 bg-purple-600 text-white rounded flex-1 hover:bg-purple-700 dark:hover:bg-purple-500"
          >
            {insertEpisodeMutation.isPending
              ? 'Inserting...'
              : 'Insert Episode'}
          </button>
          <button
            onClick={handleFetchTvSrc}
            disabled={fetchTvSrcMutation.isPending}
            className="px-4 py-2 bg-green-600 text-white rounded flex-1 hover:bg-green-700 dark:hover:bg-green-500"
          >
            {fetchTvSrcMutation.isPending
              ? 'Fetching Source...'
              : 'Fetch TV Source'}
          </button>
        </div>
        {insertEpisodeMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {insertEpisodeMutation.error.message}
          </p>
        )}
        {fetchTvSrcMutation.error && (
          <p className="text-red-600 dark:text-red-400 mt-2">
            Error: {fetchTvSrcMutation.error.message}
          </p>
        )}
      </div>
    </section>
  );
}
